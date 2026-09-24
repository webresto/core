import type { DeliveryZoneRecord } from "../../models/DeliveryZone";

/**
 * What a layer lends its zones when `termsApplyToZones` is on.
 *
 * Terms only. `enable` and `sortOrder` used to be here and are not settings a
 * layer hands down — they are combined instead, in `findServing`.
 *
 * Kept as a list rather than "everything except geometry and identity": a field
 * added later must be a deliberate choice about who prices it, and a default of
 * "inherited" would silently move somebody's tariff.
 */
const INHERITED_FIELDS = [
  "worktime",
  "minDeliveryTime",
  "minOrderTotal",
  "freeDeliveryFrom",
  "deliveryCost",
  "deliveryItem",
  "deliveryMessage",
] as const;

export function pickInheritedFields(layer: DeliveryZoneRecord): Partial<DeliveryZoneRecord> {
  const inherited: Partial<DeliveryZoneRecord> = {};
  for (const field of INHERITED_FIELDS) {
    (inherited as any)[field] = (layer as any)[field];
  }
  return inherited;
}
