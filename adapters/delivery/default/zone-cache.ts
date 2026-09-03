import { DeliveryZoneRecord } from "../../../models/DeliveryZone";

/**
 * Zones are read on every cart recount and change only when an operator edits
 * one or a sync applies a snapshot, so they are held in memory and dropped from
 * the model's lifecycle callbacks.
 *
 * The cache is per process. That is enough: a stale list can at worst use the
 * previous tariff for a few seconds, and the alternative — a shared cache —
 * would need invalidation machinery of its own.
 */

let cache: DeliveryZoneRecord[] | null = null;

/** Enabled zones with a usable polygon, in match order. */
export async function getServingZones(): Promise<DeliveryZoneRecord[]> {
  if (!cache) {
    cache = await DeliveryZone.findServing();
  }
  return cache;
}

export function invalidateDeliveryZoneCache(): void {
  cache = null;
}
