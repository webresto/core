import { Adapter } from "../../index";
import { DeliveryZoneRecord } from "../../../models/DeliveryZone";
import {
  OPERATOR_OWNED_FIELDS,
  changedSourceOwnedFields,
  getZoneOwnership,
  zoneIsLocked,
  zoneSourceIsInactive,
  ZoneOwnership,
} from "./zone-ownership";
import { DeliveryZoneSyncService, isSkipped } from "./zone-sync";

declare const mcp: any;

/**
 * The MCP tools of the delivery zones: what an operator does on the zones page,
 * for an agent.
 *
 * They live in the default adapter because the zones are its model, and every
 * write goes through `DeliveryZone`, so the zone cache is dropped by the model's
 * own callbacks — a written tariff prices the next basket without a restart.
 * The ownership rules are the zones page's: while a map link owns a city, its
 * geometry is the source's and only the operator's fields are written.
 */

/** Written only while no source owns the zone. */
const GEOMETRY_FIELDS = ["name", "polygon", "parent"] as const;

/**
 * Read when a tool runs, not when this file loads: `adapters/index` exports these
 * tools and is itself on the import path of `zone-ownership`, so at load time the
 * list may not exist yet.
 */
function writableFields(): readonly string[] {
  return [...OPERATOR_OWNED_FIELDS, ...GEOMETRY_FIELDS];
}

const NULLABLE_NUMBER = { type: ["number", "null"] };

/** The fields of a zone an agent may write, as one schema for update and update-many. */
const ZONE_FIELDS: Record<string, unknown> = {
  enable: { type: "boolean", description: "Whether the zone takes orders. An imported zone arrives switched off.", example: true },
  sortOrder: { type: "number", description: "Match order, ascending: of two zones that both contain an address the lower one answers. Put nested zones before the zone around them.", example: 10 },
  minDeliveryTime: { ...NULLABLE_NUMBER, description: "Delivery time promised in the zone, minutes. Required on a zone that prices itself.", example: 60 },
  deliveryCost: { ...NULLABLE_NUMBER, description: "Delivery cost in the zone. Required on a zone that prices itself.", example: 250 },
  minOrderTotal: { ...NULLABLE_NUMBER, description: "Orders below this total are not delivered here. null - no minimum.", example: 500 },
  freeDeliveryFrom: { ...NULLABLE_NUMBER, description: "Orders from this total are delivered free. null - never free.", example: 2000 },
  deliveryItem: { type: ["string", "null"], description: "Dish id charged instead of deliveryCost. null - charge deliveryCost.", example: null },
  deliveryMessage: { type: "string", description: "Shown to the customer at checkout.", example: "" },
  description: { type: "string", description: "Operator's note on the zone, also shown by storefronts that quote the terms.", example: "" },
  worktime: { type: "array", description: "When the zone takes orders (WorkTime format). Empty - always.", example: [] },
  termsApplyToZones: { type: "boolean", description: "On a layer: its terms are the terms of its zones.", example: true },
  customData: { type: "object", description: "Arbitrary JSON.", example: {} },
  name: { type: "string", description: "Zone name. Owned by the map while a map link owns the city.", example: "Center" },
  polygon: { type: "array", description: "Ring of [lon, lat] points. Owned by the map while a map link owns the city.", example: [] },
  parent: { type: ["string", "null"], description: "Layer the zone belongs to. Owned by the map while a map link owns the city.", example: null },
};

function idOf(value: unknown): string | null {
  if (typeof value === "string") return value;
  return (value as { id?: string } | null)?.id ?? null;
}

/** A zone as the tools answer with it. The polygon only when asked: a city's map is a lot of numbers. */
function zoneView(zone: DeliveryZoneRecord, ownership: ZoneOwnership, withPolygon: boolean) {
  const polygon = Array.isArray(zone.polygon) ? zone.polygon : [];
  return {
    id: zone.id,
    name: zone.name ?? "",
    enable: zone.enable !== false,
    sortOrder: zone.sortOrder ?? 0,
    minDeliveryTime: zone.minDeliveryTime ?? null,
    deliveryCost: zone.deliveryCost ?? null,
    minOrderTotal: zone.minOrderTotal ?? null,
    freeDeliveryFrom: zone.freeDeliveryFrom ?? null,
    deliveryItem: idOf(zone.deliveryItem),
    deliveryMessage: zone.deliveryMessage ?? "",
    description: zone.description ?? "",
    worktime: zone.worktime ?? [],
    city: idOf(zone.city),
    parent: idOf(zone.parent),
    isLayer: polygon.length === 0,
    termsApplyToZones: zone.termsApplyToZones !== false,
    source: zone.source ?? null,
    externalId: zone.externalId ?? null,
    lastSyncedAt: zone.lastSyncedAt ?? null,
    missingFromSourceAt: zone.missingFromSourceAt ?? null,
    locked: zoneIsLocked(zone, ownership),
    sourceInactive: zoneSourceIsInactive(zone, ownership),
    polygonPoints: polygon.length,
    ...(withPolygon ? { polygon } : {}),
  };
}

async function assertDefaultAdapter(): Promise<void> {
  if (!(await Adapter.isDefault("delivery"))) {
    throw new Error("Delivery zones belong to the default delivery adapter, and this installation prices delivery with another one");
  }
}

/** The writable fields of an input, refusing a field nobody may write here rather than dropping it. */
function zoneValues(input: Record<string, unknown>): Partial<DeliveryZoneRecord> {
  const values: Record<string, unknown> = {};
  const writable = writableFields();
  for (const [field, value] of Object.entries(input)) {
    if (value === undefined) continue;
    if (!writable.includes(field)) {
      throw new Error(`Zone field "${field}" cannot be written here. Writable: ${writable.join(", ")}`);
    }
    values[field] = value;
  }
  return values as Partial<DeliveryZoneRecord>;
}

/**
 * Writes one zone the way the zones page does: a source-owned field may not
 * change while the source owns the zone, everything else goes through the model.
 * The id rides along — the model judges the terms against the row it writes.
 */
async function updateZone(id: string, values: Partial<DeliveryZoneRecord>, ownership: ZoneOwnership): Promise<DeliveryZoneRecord> {
  const existing = await DeliveryZone.findOne({ id });
  if (!existing) throw new Error(`Zone ${id} not found`);

  if (zoneIsLocked(existing, ownership)) {
    const rejected = changedSourceOwnedFields(existing, values);
    if (rejected.length) {
      throw new Error(
        `Zone "${existing.name}" is owned by the "${existing.source}" synchronisation, so ${rejected.join(", ")} ` +
          `cannot be changed here. Change the map, or detach the zone from its source.`,
      );
    }
  }

  if (!Object.keys(values).length) return existing;
  return await DeliveryZone.updateOne({ id }, { ...values, id });
}

export function registerDeliveryZoneTools(): void {
  mcp.registerTool({
    name: "zone-list",
    group: "delivery-zones",
    description:
      "Returns the delivery zones with their terms, by sortOrder. Polygons are left out unless includePolygon. " +
      "locked=true means a map link owns the zone: its name, polygon and layer come from the map.",
    mode: "protected",
    schema: {
      type: "object",
      properties: {
        city: { type: "string", description: "Only the zones of this city (id).", example: "abc123" },
        enable: { type: "boolean", description: "Only switched on (true) or off (false) zones. Left out - both.", example: true },
        includeLayers: { type: "boolean", description: "Include layers (rows without a polygon that group zones).", example: false },
        includePolygon: { type: "boolean", description: "Include each zone's polygon.", example: false },
      },
    },
    handler: async ({ city, enable, includeLayers, includePolygon }: Record<string, any>) => {
      await assertDefaultAdapter();
      const criteria: Record<string, unknown> = {};
      if (city) criteria.city = city;
      if (typeof enable === "boolean") criteria.enable = enable;

      const ownership = await getZoneOwnership();
      const zones = (await DeliveryZone.find(criteria))
        .map((zone) => zoneView(zone, ownership, includePolygon === true))
        .filter((zone) => includeLayers === true || !zone.isLayer)
        .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
      return { count: zones.length, zones };
    },
  });

  mcp.registerTool({
    name: "zone-get",
    group: "delivery-zones",
    description: "Returns one delivery zone with its polygon.",
    mode: "protected",
    schema: {
      type: "object",
      properties: { id: { type: "string", description: "Zone ID.", example: "abc123" } },
      required: ["id"],
    },
    handler: async ({ id }: { id: string }) => {
      await assertDefaultAdapter();
      const zone = await DeliveryZone.findOne({ id });
      if (!zone) throw new Error(`Zone ${id} not found`);
      return zoneView(zone, await getZoneOwnership(), true);
    },
  });

  mcp.registerTool({
    name: "zone-update",
    group: "delivery-zones",
    description:
      "Updates one delivery zone. Pass id and only the fields to change. The zone cache is dropped, so the next basket is priced with the new terms. " +
      "While a map link owns the zone (locked), name, polygon and parent are the map's and are refused.",
    mode: "protected",
    schema: {
      type: "object",
      properties: { id: { type: "string", description: "Zone ID.", example: "abc123" }, ...ZONE_FIELDS },
      required: ["id"],
    },
    handler: async ({ id, ...fields }: Record<string, any>) => {
      await assertDefaultAdapter();
      const ownership = await getZoneOwnership();
      return zoneView(await updateZone(id, zoneValues(fields), ownership), ownership, false);
    },
  });

  mcp.registerTool({
    name: "zone-update-many",
    group: "delivery-zones",
    description:
      "Writes the same fields on many delivery zones: switch a whole map on, set one minimum everywhere. " +
      "Pick the zones by ids, or by where (where: {} is every zone, layers excluded). Each zone is written on its own: " +
      "one refused does not stop the rest, and the answer lists what failed.",
    mode: "protected",
    schema: {
      type: "object",
      properties: {
        ids: { type: "array", items: { type: "string" }, description: "Zone IDs.", example: ["abc123"] },
        where: {
          type: "object",
          description: "Selects zones instead of ids: city (id), source (e.g. \"kml\"), enable (boolean). {} - every zone.",
          properties: {
            city: { type: "string" },
            source: { type: ["string", "null"] },
            enable: { type: "boolean" },
          },
          example: { city: "abc123" },
        },
        set: { type: "object", description: "The fields to write, as in zone-update.", properties: ZONE_FIELDS, example: { enable: true, minOrderTotal: 500 } },
      },
      required: ["set"],
    },
    handler: async ({ ids, where, set }: { ids?: string[]; where?: Record<string, unknown>; set: Record<string, unknown> }) => {
      await assertDefaultAdapter();
      if (!set || typeof set !== "object" || !Object.keys(set).length) throw new Error("set must name at least one field");
      if (!Array.isArray(ids) && (!where || typeof where !== "object")) throw new Error("Pick the zones: ids, or where ({} for all)");

      const values = zoneValues(set);
      const criteria: Record<string, unknown> = {};
      if (Array.isArray(ids)) criteria.id = ids;
      for (const key of ["city", "source", "enable"]) {
        if (where && where[key] !== undefined) criteria[key] = where[key];
      }

      const ownership = await getZoneOwnership();
      const zones = (await DeliveryZone.find(criteria)).filter(
        (zone) => Array.isArray(ids) || (Array.isArray(zone.polygon) && zone.polygon.length > 0),
      );

      const failed: Array<{ id: string; name: string; error: string }> = [];
      let updated = 0;
      for (const zone of zones) {
        try {
          await updateZone(zone.id, values, ownership);
          updated++;
        } catch (error) {
          failed.push({ id: zone.id, name: zone.name ?? "", error: error instanceof Error ? error.message : String(error) });
        }
      }

      const missing = Array.isArray(ids) ? ids.filter((id) => !zones.some((zone) => zone.id === id)) : [];
      return { matched: zones.length, updated, failed, missing };
    },
  });

  mcp.registerTool({
    name: "zone-sync",
    group: "delivery-zones",
    description:
      "Runs the zone synchronisation from the map links of DELIVERY_ZONE_SYNC_CONFIG now, instead of waiting for the schedule. " +
      "dryRun reports the difference and writes nothing. New zones arrive switched off; the operator's fields are never overwritten.",
    mode: "protected",
    schema: {
      type: "object",
      properties: {
        dryRun: { type: "boolean", description: "Report what would change, write nothing.", example: false },
        details: { type: "boolean", description: "Include the per-zone entries of the difference.", example: false },
      },
    },
    handler: async ({ dryRun, details }: { dryRun?: boolean; details?: boolean }) => {
      await assertDefaultAdapter();
      const outcome = await DeliveryZoneSyncService.run({ reason: "manual", dryRun: dryRun === true });
      if (isSkipped(outcome)) return outcome;
      const { entries, ...summary } = outcome;
      return details === true ? outcome : { ...summary, entries: entries.length };
    },
  });
}
