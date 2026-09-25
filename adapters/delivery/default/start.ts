import { Adapter } from "../../index";
import { SetupChecklistRegistry } from "../../../lib/SetupChecklistRegistry";
import { getServingZones } from "./zone-cache";
import { DeliveryZoneSyncService } from "./zone-sync";

/**
 * What the default delivery adapter needs running once core has booted: the
 * zone sync schedule and the setup checkup that asks for a zone.
 *
 * Called by core's boot rather than by the adapter itself, because the timer and
 * the checklist outlive any one call to the adapter.
 */
export async function startDefaultDelivery(): Promise<void> {
  // Core owns the timer so an adapter never grows one; it starts only when the
  // setting is on *and* a city has a map link, which means an install with
  // hand-made zones schedules nothing at all.
  try {
    await DeliveryZoneSyncService.start();

    // Pointing the source somewhere else has to take effect without a
    // restart, and the interval lives in the timer that is being replaced.
    const restartZoneSync = async () => {
      try {
        await DeliveryZoneSyncService.start();
      } catch (error) {
        sails.log.error("RestoCore > delivery zone sync restart failed", error);
      }
    };
    emitter.on("settings:DELIVERY_ZONE_SYNC_ENABLED", "restocore-zone-sync", restartZoneSync);
    emitter.on("settings:DELIVERY_ZONE_SYNC_INTERVAL_SECONDS", "restocore-zone-sync", restartZoneSync);
    emitter.on("settings:DELIVERY_ZONE_SYNC_CONFIG", "restocore-zone-sync", restartZoneSync);
  } catch (error) {
    sails.log.error("RestoCore > delivery zone sync did not start", error);
  }

  // A zone is what this adapter prices with; another adapter's installation has
  // no use for being asked to draw one.
  if (!(await Adapter.isDefault("delivery"))) return;

  SetupChecklistRegistry.registerCheckup({
    key: "has_delivery_zone",
    group: "project",
    severity: "required",
    titleKey: "Delivery zone configured",
    sourceModule: "core",
    sortOrder: 7,
    target: { url: "/delivery-zones-manager" },
    // Zones are the only delivery tariff: without one that can take an order,
    // every delivery is refused. "Can take an order" is the adapter's own list
    // — enabled, with a shape, its layer on — and its terms set by itself or
    // by that layer.
    check: async () => {
      const zones = await getServingZones();
      const priced = zones.filter((zone) => Number.isFinite(zone.minDeliveryTime) && Number.isFinite(zone.deliveryCost));
      if (!priced.length) return { status: "todo", detailKey: "No enabled delivery zone with its delivery time and cost" };
      return { status: "done", detailKey: "Zones that deliver: {count}", detailParams: { count: priced.length } };
    },
  });
}
