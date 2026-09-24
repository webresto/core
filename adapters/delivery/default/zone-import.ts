import { v4 as uuid } from "uuid";
import hashCode from "../../../lib/hashCode";
import { RequiredField } from "../../../interfaces/toolsTS";
import {
  DeliveryZoneSnapshot,
  ImportedDeliveryZone,
} from "../contracts";
import { DeliveryZoneRecord } from "../../../models/DeliveryZone";
import { isValidPolygon } from "./zone-match";
import { invalidateDeliveryZoneCache } from "./zone-cache";
import { LocalZoneGeometry } from "./geojson";

/**
 * Applying an external snapshot to the zones core owns.
 *
 * Two rules shape everything here. A snapshot is applied whole or not at all,
 * so a truncated download cannot half-update the map. And the source owns only
 * the geometry and its own identifiers — tariffs, kitchen, worktime and the
 * enable switch belong to the operator, who would otherwise lose an afternoon
 * of work to somebody dragging a polygon in Google Maps.
 *
 * The one thing an import decides about a zone is how it arrives: switched off.
 * A folder — a layer — arrives on, because a layer that is off takes its zones
 * with it and switching one zone on would then do nothing.
 *
 * And a new row that has to price itself — a layer, a zone outside any layer,
 * a zone in a layer that only groups — arrives with the time and cost the
 * operator gave the source (`ZoneTerms`), because the model refuses such a row
 * without them. A row that already exists keeps its terms, as it keeps
 * everything else that is the operator's.
 */

/** The two terms every new self-priced row gets from whoever started the import. */
export interface ZoneTerms {
  minDeliveryTime: number;
  deliveryCost: number;
}

export type ZoneImportAction = "create" | "update" | "unchanged" | "missing";

export interface ZoneDiffEntry {
  action: ZoneImportAction;
  externalId: string;
  name: string;
  /** The row this entry refers to, when it already exists. */
  zoneId?: string;
  /** Source-owned fields that would change. */
  changes?: string[];
}

export interface ZoneImportStats {
  created: number;
  updated: number;
  unchanged: number;
  missing: number;
  failed: number;
}

export interface ZoneImportResult {
  source: string;
  /** The city this run covered; `null` on a single-city installation. */
  city: string | null;
  dryRun: boolean;
  stats: ZoneImportStats;
  entries: ZoneDiffEntry[];
  /** Blocking problems. A non-empty list means nothing was written. */
  errors: string[];
}

/**
 * The id behind a city reference.
 *
 * Waterline hands back a plain id on one read and a populated record on another,
 * and an unset association is `null` from one datastore and `undefined` from the
 * next. All of those have to compare equal, or a zone ends up counted against a
 * different city than the one it was written with.
 */
function cityIdOf(value: unknown): string | null {
  if (typeof value === "string") return value.trim() || null;
  if (value && typeof value === "object" && typeof (value as { id?: unknown }).id === "string") {
    return (value as { id: string }).id.trim() || null;
  }
  return null;
}

/** Fields a source is allowed to write. Everything else is the operator's. */
const SOURCE_OWNED_FIELDS = ["name", "polygon", "sourceHash", "sourceUpdatedAt", "lastSyncedAt"] as const;

/**
 * Identifies the source-owned payload of a zone.
 *
 * Only the fields the source owns go in, so an operator editing a tariff does
 * not make the next sync think the geometry changed.
 */
export function sourceHashOf(zone: ImportedDeliveryZone): string {
  return hashCode(JSON.stringify({ name: zone.name, polygon: zone.polygon, description: zone.description ?? "" }));
}

/**
 * Checks the whole snapshot before anything is written.
 *
 * Returns every problem rather than the first one: an operator fixing a KML
 * wants the full list, not one error per download.
 */
export function validateSnapshot(snapshot: DeliveryZoneSnapshot | null | undefined): string[] {
  const errors: string[] = [];

  if (!snapshot || typeof snapshot !== "object") {
    return ["Snapshot is empty"];
  }

  if (!snapshot.source || typeof snapshot.source !== "string") {
    errors.push("Snapshot has no source name");
  }

  if (!Array.isArray(snapshot.zones)) {
    errors.push("Snapshot has no zone list");
    return errors;
  }

  const seen = new Set<string>();
  for (const [index, zone] of snapshot.zones.entries()) {
    const where = zone?.name ? `"${zone.name}"` : `#${index + 1}`;

    if (!zone?.externalId || typeof zone.externalId !== "string" || !zone.externalId.trim()) {
      // Without a stable key the next sync cannot tell an edit from a new zone,
      // and would eventually orphan every manual setting attached to this row.
      errors.push(`Zone ${where} has no external id`);
      continue;
    }

    if (seen.has(zone.externalId)) {
      errors.push(`External id "${zone.externalId}" appears more than once in the snapshot`);
      continue;
    }
    seen.add(zone.externalId);

    if (!zone.name || typeof zone.name !== "string") {
      errors.push(`Zone ${where} has no name`);
    }

    if (!isValidPolygon(zone.polygon)) {
      errors.push(`Zone ${where} has an unusable polygon`);
    }
  }

  return errors;
}

function changedFields(
  existing: DeliveryZoneRecord,
  incoming: ImportedDeliveryZone,
  updateDescriptions: boolean,
  layerId: string | null,
): string[] {
  const changes: string[] = [];

  if (existing.name !== incoming.name) changes.push("name");
  if (JSON.stringify(existing.polygon ?? null) !== JSON.stringify(incoming.polygon)) changes.push("polygon");
  if (updateDescriptions && (existing.description ?? "") !== (incoming.description ?? "")) changes.push("description");
  if (existing.missingFromSourceAt) changes.push("missingFromSourceAt");
  // The folder a placemark sits in is not in the source hash and changes neither
  // name nor geometry, so a zone moved between layers upstream would otherwise
  // read as unchanged and keep pointing at the layer it left.
  if (cityIdOf(existing.parent) !== layerId) changes.push("parent");

  return changes;
}

export class DeliveryZoneImportService {
  /**
   * Applies a validated snapshot.
   *
   * `dryRun` produces the same diff without writing anything, which is what the
   * first run after a migration is supposed to use. `terms` go onto the new
   * rows that price themselves; a dry run writes no row and needs none.
   */
  public static async apply(
    snapshot: DeliveryZoneSnapshot,
    options: { dryRun?: boolean; terms?: ZoneTerms } = {},
  ): Promise<ZoneImportResult> {
    const dryRun = options.dryRun === true;
    const errors = validateSnapshot(snapshot);
    const stats: ZoneImportStats = { created: 0, updated: 0, unchanged: 0, missing: 0, failed: 0 };
    const entries: ZoneDiffEntry[] = [];

    if (errors.length) {
      // Nothing is written. A bad snapshot leaves the existing zones exactly as
      // they were, which is the whole point of validating up front.
      return { source: snapshot?.source ?? "", city: cityIdOf(snapshot?.city), dryRun, stats, entries, errors };
    }

    const source = snapshot.source;
    const city = cityIdOf(snapshot.city);
    const updateDescriptions = snapshot.updateDescriptions === true;
    const now = Date.now();

    // Scoped to one city, and the filtering is done here rather than in the
    // query because "no city" arrives as `null` from one datastore and
    // `undefined` from another and both mean the same thing.
    //
    // The scope matters most for the missing-zone loop below: without it, a city
    // whose snapshot lists ten zones would conclude that every zone of every
    // other city has vanished from the source.
    const allOfSource = (await DeliveryZone.find({ source })) as DeliveryZoneRecord[];
    const existingZones = allOfSource.filter((zone) => cityIdOf(zone.city) === city);
    const byExternalId = new Map(existingZones.map((zone) => [zone.externalId as string, zone]));

    // Layers before zones: a zone's `parent` has to name a row that exists.
    //
    // A layer is a row of this source like any other — same identity, same
    // missing-zone handling — it simply has no polygon. That is why it is
    // written through the same map and not kept somewhere separate.
    const layers = new Map<string, { externalId: string; name: string }>();
    for (const zone of snapshot.zones) {
      if (zone.layer) layers.set(zone.layer.externalId, zone.layer);
    }

    const layerIds = new Map<string, string>();
    // The layers whose terms price their zones, so a new zone in one needs none
    // of its own. A layer created here is one of them: that is the default.
    const lendingLayerIds = new Set<string>();
    for (const layer of layers.values()) {
      const existing = byExternalId.get(layer.externalId);

      if (existing) {
        layerIds.set(layer.externalId, String(existing.id));
        if (existing.termsApplyToZones !== false) lendingLayerIds.add(String(existing.id));
        if (existing.name !== layer.name || existing.missingFromSourceAt) {
          entries.push({ action: "update", externalId: layer.externalId, name: layer.name, zoneId: existing.id, changes: ["name"] });
          stats.updated++;
          if (!dryRun) {
            await DeliveryZone.updateOne({ id: existing.id }, {
              name: layer.name,
              lastSyncedAt: now,
              missingFromSourceAt: null,
            });
          }
        } else {
          entries.push({ action: "unchanged", externalId: layer.externalId, name: layer.name, zoneId: existing.id });
          stats.unchanged++;
        }
        continue;
      }

      const id = uuid();
      layerIds.set(layer.externalId, id);
      lendingLayerIds.add(id);
      entries.push({ action: "create", externalId: layer.externalId, name: layer.name, zoneId: id });
      stats.created++;

      if (!dryRun) {
        try {
          await DeliveryZone.create({
            id,
            name: layer.name,
            source,
            city,
            externalId: layer.externalId,
            lastSyncedAt: now,
            missingFromSourceAt: null,
            ...options.terms,
          }).fetch();
        } catch (error) {
          sails.log.error(`CORE > zone import > create layer "${layer.externalId}" failed`, error);
          stats.created--;
          stats.failed++;
          layerIds.delete(layer.externalId);
        }
      }
    }

    for (const incoming of snapshot.zones) {
      const existing = byExternalId.get(incoming.externalId);
      const sourceHash = incoming.sourceHash ?? sourceHashOf(incoming);



      const values: Partial<DeliveryZoneRecord> = {
        name: incoming.name,
        polygon: incoming.polygon,
        source,
        city,
        externalId: incoming.externalId,
        sourceHash,
        sourceUpdatedAt: incoming.sourceUpdatedAt ?? null,
        lastSyncedAt: now,
        missingFromSourceAt: null,
        // The layer is the source's to decide, so it is rewritten on every run:
        // a placemark moved between folders upstream moves here too. Regrouping
        // an imported zone by hand would be undone by the next run anyway.
        parent: incoming.layer ? layerIds.get(incoming.layer.externalId) ?? null : null,
      };

      // Descriptions double as operator-written delivery terms in this schema,
      // so they move only when the source is explicitly allowed to own them.
      if (updateDescriptions) values.description = incoming.description ?? "";

      if (!existing) {
        // The id is generated here rather than by the model hook so the diff can
        // name the row a dry run would create.
        const parent = values.parent as string | null;
        const created: RequiredField<Partial<DeliveryZoneRecord>, "id" | "polygon"> = {
          ...values,
          ...(parent && lendingLayerIds.has(parent) ? {} : options.terms),
          id: uuid(),
          polygon: incoming.polygon,
          // Off on arrival, and only here: a zone nobody has looked at yet is a
          // polygon drawn in another program, with no tariff and no decision
          // behind it. Set on the create and not in `values`, which is also the
          // update payload — from the moment the row exists the switch is the
          // operator’s alone.
          enable: false,
        };
        entries.push({ action: "create", externalId: incoming.externalId, name: incoming.name, zoneId: created.id });
        stats.created++;
        if (!dryRun) {
          try {
            await DeliveryZone.create(created).fetch();
          } catch (error) {
            sails.log.error(`CORE > zone import > create "${incoming.externalId}" failed`, error);
            stats.created--;
            stats.failed++;
          }
        }
        continue;
      }

      const changes = changedFields(existing, incoming, updateDescriptions, values.parent as string | null);
      if (!changes.length && existing.sourceHash === sourceHash) {
        entries.push({ action: "unchanged", externalId: incoming.externalId, name: incoming.name, zoneId: existing.id });
        stats.unchanged++;
        continue;
      }

      entries.push({
        action: "update",
        externalId: incoming.externalId,
        name: incoming.name,
        zoneId: existing.id,
        changes,
      });
      stats.updated++;

      if (!dryRun) {
        try {
          // With the id: `values` rewrites the parent, and the model judges the
          // terms against the row it lands on.
          await DeliveryZone.updateOne({ id: existing.id }, { ...values, id: existing.id });
        } catch (error) {
          sails.log.error(`CORE > zone import > update "${incoming.externalId}" failed`, error);
          stats.updated--;
          stats.failed++;
        }
      }
    }

    // Zones the source no longer lists are marked, never deleted: a renamed or
    // re-keyed zone upstream looks exactly the same as a removed one, and only
    // an operator can tell the difference.
    const present = new Set([
      ...snapshot.zones.map((zone) => zone.externalId),
      ...layers.keys(),
    ]);
    for (const zone of existingZones) {
      if (present.has(zone.externalId as string)) continue;


      entries.push({
        action: "missing",
        externalId: (zone.externalId as string) ?? "",
        name: zone.name ?? "",
        zoneId: zone.id,
      });
      stats.missing++;

      if (!dryRun && !zone.missingFromSourceAt) {
        try {
          await DeliveryZone.updateOne({ id: zone.id }, { missingFromSourceAt: now });
        } catch (error) {
          sails.log.error(`CORE > zone import > marking "${zone.externalId}" as missing failed`, error);
          stats.failed++;
        }
      }
    }

    if (!dryRun) invalidateDeliveryZoneCache();

    return { source, city, dryRun, stats, entries, errors };
  }

  /** The fields a snapshot is allowed to write, for documentation and tests. */
  public static sourceOwnedFields(): readonly string[] {
    return SOURCE_OWNED_FIELDS;
  }
}

/**
 * Zones out of a file the operator picked, as rows of their own.
 *
 * The opposite of everything above: no source, no external id, no diff. A file
 * is read once, and from the moment the rows exist nothing upstream has an
 * opinion about them — a second upload of the same file makes a second set of
 * zones with the same names, which the operator sees in the list and deletes.
 *
 * They arrive switched on, unlike a synchronised zone: an operator who just
 * picked a file is looking at the map they meant to draw, not at a polygon
 * somebody else changed. And with the terms given next to the file: a file
 * carries no layers, so every row prices itself.
 */
export async function importLocalZones(params: {
  city: string | null;
  zones: LocalZoneGeometry[];
  terms: ZoneTerms;
}): Promise<{ created: number; skipped: string[] }> {
  const skipped: string[] = [];
  let created = 0;

  for (const zone of params.zones) {
    if (!isValidPolygon(zone.polygon)) {
      skipped.push(zone.name);
      continue;
    }

    await DeliveryZone.create({
      name: zone.name,
      polygon: zone.polygon,
      city: params.city,
      ...params.terms,
      enable: true,
      // The file's own order: a map drawn north to south stays that way in the
      // list, and matching walks the zones in it.
      sortOrder: created,
    } as any).fetch();
    created++;
  }

  return { created, skipped };
}
