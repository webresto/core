import { DeliveryZoneRecord } from "../../../models/DeliveryZone";
import { KML_SOURCE_NAME } from "./kml";
import { DeliveryZoneSyncService } from "./zone-sync";

/**
 * Who owns what on a zone.
 *
 * A zone has two owners at once: an external source owns the geometry it
 * publishes, and the operator owns the commercial terms wrapped around it. This
 * module is the single place that decides which is which, so the editor, the API
 * and the import cannot drift apart on the question.
 *
 * The rules deliberately live here rather than on the model. Model files end
 * with `module.exports = {...}`, which replaces every named export at runtime —
 * a constant declared there type-checks at the import site and is `undefined`
 * when the code actually runs.
 */

/**
 * Fields an external source writes on every import.
 *
 * `city` is here rather than among the operator's fields because it is part of
 * the zone's identity, not a note about it: a source is configured per city, and
 * moving a synchronised zone to another city would take it out of the scope its
 * own source imports and leave the next run creating it again.
 */
// `parent` is here because grouping is the source's: a KML folder is the layer,
// the import rewrites it on every run, and an operator who regrouped an imported
// zone by hand would have it moved back on the next one. Local zones have no
// source, so nothing locks their grouping.
export const SOURCE_OWNED_FIELDS = ["name", "polygon", "source", "city", "externalId", "parent"] as const;

/** Fields no synchronisation may touch, whoever owns the geometry. */
export const OPERATOR_OWNED_FIELDS = [
  "enable",
  "sortOrder",
  // Whether a layer prices its zones is an operator's answer about a folder,
  // not something the folder states.
  "termsApplyToZones",
  "worktime",
  "minDeliveryTime",
  "minOrderTotal",
  "freeDeliveryFrom",
  "deliveryCost",
  "deliveryItem",
  "deliveryMessage",
  "customData",
  // Not source-owned either: the import writes it only when a snapshot says
  // descriptions may be overwritten, and operators keep delivery terms in it.
  "description",
] as const;

/**
 * What the source owns right now, answered per city.
 *
 * Ownership follows *configuration*, not installation: a city with a map link
 * in `DELIVERY_ZONE_SYNC_CONFIG` has its geometry overwritten on every run, so
 * its polygons are locked, while a city with no link is drawn by hand and stays
 * editable. Asking the question globally was the old mistake — it locked every
 * city the moment the KML module was installed anywhere.
 *
 * `DELIVERY_ZONE_SYNC_ENABLED` deliberately does not participate: it governs the
 * schedule, and the manual button overwrites just as thoroughly.
 */
export interface ZoneOwnership {
  /**
   * The map link of each city, by city id, with `""` for the city-less zones of
   * a single-city installation. Plain data, because the zones page is sent it as
   * it is and looks up the city it is showing.
   */
  sourceUrls: Record<string, string>;
  /** Source owning this city's geometry, or `null` when it has no link. */
  activeSourceFor(city: string | null | undefined): string | null;
  /** Where to go and edit that geometry instead. */
  sourceUrlFor(city: string | null | undefined): string | null;
}

/** Read once per request: the configuration comes from the database. */
export async function getZoneOwnership(): Promise<ZoneOwnership> {
  const urls = await DeliveryZoneSyncService.configuredSourceUrls();

  // A single-city installation writes the configuration flat and its zones carry
  // no city, so the flat entry answers for them under the same empty key.
  const urlFor = (city: string | null | undefined): string | null =>
    urls.get(typeof city === "string" && city ? city : null) ?? null;

  return {
    sourceUrls: Object.fromEntries([...urls].map(([city, url]) => [city ?? "", url])),
    activeSourceFor: (city) => (urlFor(city) ? KML_SOURCE_NAME : null),
    sourceUrlFor: urlFor,
  };
}

/**
 * Whether this particular zone is owned by the source configured for its city.
 *
 * One way out of the locked state, and it is deliberate. A zone still carrying a
 * `source` whose city no longer has a link is not locked: no run will overwrite
 * it, and leaving it frozen would strand the geometry with no way to fix it.
 *
 * There is no second way. Detaching a zone from its source was removed: the
 * source owns the geometry, the operator owns the tariff, and there is no mode
 * to switch between.
 */
export function zoneIsLocked(zone: Partial<DeliveryZoneRecord>, ownership: ZoneOwnership): boolean {
  const city = typeof zone.city === "string" ? zone.city : (zone.city as any)?.id ?? null;
  const activeSource = ownership.activeSourceFor(city);
  return Boolean(zone.source && activeSource && zone.source === activeSource);
}

/** A zone that came from a source no longer configured for its city. */
export function zoneSourceIsInactive(zone: Partial<DeliveryZoneRecord>, ownership: ZoneOwnership): boolean {
  return Boolean(zone.source) && !zoneIsLocked(zone, ownership);
}

/** Drops everything a source owns, leaving the operator's own fields. */
export function pickOperatorFields(values: Partial<DeliveryZoneRecord>): Partial<DeliveryZoneRecord> {
  const operatorValues: Partial<DeliveryZoneRecord> = {};
  for (const field of OPERATOR_OWNED_FIELDS) {
    if (field in values) (operatorValues as any)[field] = (values as any)[field];
  }
  return operatorValues;
}

/**
 * Which source-owned fields this request would have changed.
 *
 * The editor posts the whole zone, so equal values are not an attempt to edit
 * anything — only a difference is. Reporting it instead of silently dropping it
 * keeps a stale page from swallowing an operator's work without a word.
 */
function emptyToNull(polygon: unknown): string | null {
  return Array.isArray(polygon) && polygon.length ? JSON.stringify(polygon) : null;
}

export function changedSourceOwnedFields(
  existing: Partial<DeliveryZoneRecord>,
  values: Partial<DeliveryZoneRecord>,
): string[] {
  return SOURCE_OWNED_FIELDS.filter((field) => {
    if (!(field in values)) return false;
    const before = (existing as any)[field] ?? null;
    const after = (values as any)[field] ?? null;
    // A layer has no shape, and "no shape" arrives written two ways: the import
    // creates the row without the column, the editor posts an empty ring. Compared
    // literally those differ, and every imported layer became uneditable — the
    // panel was told it was trying to reshape a polygon that does not exist.
    if (field === "polygon") return emptyToNull(before) !== emptyToNull(after);
    return before !== after;
  });
}
