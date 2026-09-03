import { DeliveryZoneRecord } from "../../../../models/DeliveryZone";
import { isValidPolygon } from "../../../../adapters/delivery/default/zone-match";
import { ZoneOwnership, zoneIsLocked, zoneSourceIsInactive } from "../../../../adapters/delivery/default/zone-ownership";
import { Delivery } from "../../../../adapters";
import { DELIVERY_ZONES_ACCESS, getModulePermissions, requireModulePermission } from "./access-rights";

/** Access guards and record mapping for the Delivery zones module. */

/**
 * The page and its five routes exist for the built-in delivery adapter and for
 * nothing else: `DeliveryZone` is its model. Point delivery elsewhere and the
 * whole surface goes — the sidebar entry is withdrawn in `bindModule`, and here
 * is where the URLs stop answering, so knowing one buys nothing.
 */
async function adapterServesZones(res: any): Promise<boolean> {
  if (await Delivery.isDefault()) return true;
  res.status(404).json({ error: "Delivery zones are managed by the delivery adapter in use" });
  return false;
}

export async function hasAccess(req: any, res: any): Promise<boolean> {
  if (!requireModulePermission(req, res, DELIVERY_ZONES_ACCESS, "view")) return false;
  return adapterServesZones(res);
}

export async function hasManageAccess(req: any, res: any): Promise<boolean> {
  if (!requireModulePermission(req, res, DELIVERY_ZONES_ACCESS, "manage")) return false;
  return adapterServesZones(res);
}

export function getDeliveryZonePermissions(req: any) {
  return getModulePermissions(req, DELIVERY_ZONES_ACCESS);
}

function toNumberOrNull(value: any): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toStringOrNull(value: any): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/** What the browser gets. Source metadata is read-only except the two keys. */
export function toZoneView(zone: DeliveryZoneRecord, ownership: ZoneOwnership) {
  return {
    id: zone.id,
    name: zone.name ?? "",
    description: zone.description ?? "",
    enable: zone.enable !== false,
    sortOrder: zone.sortOrder ?? 0,
    polygon: zone.polygon ?? [],
    worktime: zone.worktime ?? [],
    minDeliveryTime: zone.minDeliveryTime ?? null,
    minOrderTotal: zone.minOrderTotal ?? null,
    freeDeliveryFrom: zone.freeDeliveryFrom ?? null,
    deliveryCost: zone.deliveryCost ?? null,
    deliveryItem: typeof zone.deliveryItem === "string" ? zone.deliveryItem : (zone.deliveryItem as any)?.id ?? null,
    deliveryMessage: zone.deliveryMessage ?? "",

    city: typeof zone.city === "string" ? zone.city : (zone.city as any)?.id ?? null,
    // The layer this row sits in, and whether the row *is* one. A layer has no
    // polygon. Whether it also prices its zones is its own answer, and the panel
    // greys their term fields out only when it says yes.
    parent: typeof zone.parent === "string" ? zone.parent : (zone.parent as any)?.id ?? null,
    isLayer: !Array.isArray(zone.polygon) || zone.polygon.length === 0,
    termsApplyToZones: zone.termsApplyToZones !== false,
    source: zone.source ?? null,
    externalId: zone.externalId ?? null,
    lastSyncedAt: zone.lastSyncedAt ?? null,
    missingFromSourceAt: zone.missingFromSourceAt ?? null,

    locked: zoneIsLocked(zone, ownership),
    sourceInactive: zoneSourceIsInactive(zone, ownership),
  };
}

export interface ZoneInputResult {
  values?: Partial<DeliveryZoneRecord>;
  error?: string;
}

/**
 * Reads a zone out of a request body.
 *
 * Only operator-owned fields plus `source`/`externalId` are accepted. The rest
 * of the source metadata — hash, timestamps, the missing marker — belongs to the
 * sync and is never taken from the browser.
 *
 * `source` and `externalId` *are* editable, because reconciling them by hand is
 * the documented way to attach existing zones to a newly configured source.
 */
export function readZoneInput(body: any): ZoneInputResult {
  if (!body || typeof body !== "object") return { error: "Body must be an object" };

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return { error: "Zone name is required" };

  // A layer is a row without geometry, so an empty polygon is a shape of row
  // rather than a mistake. Anything else still has to be a usable ring.
  const asLayer = !Array.isArray(body.polygon) || body.polygon.length === 0;
  if (!asLayer && !isValidPolygon(body.polygon)) {
    return { error: "Polygon must be a ring of at least three distinct [lon, lat] points" };
  }

  const parent = toStringOrNull(body.parent);
  if (asLayer && parent) {
    return { error: "A layer cannot sit inside another layer" };
  }

  const values: Partial<DeliveryZoneRecord> = {
    name,
    description: typeof body.description === "string" ? body.description : "",
    enable: body.enable !== false,
    sortOrder: toNumberOrNull(body.sortOrder) ?? 0,
    polygon: asLayer ? [] : body.polygon,
    parent: parent as any,
    // Sent by every row and read off layers only, which is where it means
    // anything. A zone carrying `true` lends its terms to nothing.
    termsApplyToZones: body.termsApplyToZones !== false,
    worktime: Array.isArray(body.worktime) ? body.worktime : [],
    minDeliveryTime: toNumberOrNull(body.minDeliveryTime) as any,
    minOrderTotal: toNumberOrNull(body.minOrderTotal) as any,
    freeDeliveryFrom: toNumberOrNull(body.freeDeliveryFrom) as any,
    deliveryCost: toNumberOrNull(body.deliveryCost) as any,
    deliveryItem: toStringOrNull(body.deliveryItem) as any,
    deliveryMessage: typeof body.deliveryMessage === "string" ? body.deliveryMessage : "",

    city: toStringOrNull(body.city),
    source: toStringOrNull(body.source),
    externalId: toStringOrNull(body.externalId),
  };

  if (values.source && !values.externalId) {
    return { error: "A zone with a source needs an external id" };
  }
  if (!values.source && values.externalId) {
    return { error: "An external id without a source cannot be matched to anything" };
  }

  return { values };
}
