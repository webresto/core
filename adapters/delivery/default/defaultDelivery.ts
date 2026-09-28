import OrderAddress from "../../../interfaces/OrderAddress";
import { OrderRecord } from "../../../models/Order";
import DeliveryAdapter from "../DeliveryAdapter";
import { Delivery, DeliveryCoordinate, PlaceCandidate } from "../../../interfaces/Delivery";
import { applyZone, describeZone, matchZone, unmatchedZone } from "./zone-calculation";
import { getServingZones } from "./zone-cache";
import { findZoneForCoordinate, nearestPlaceInZone } from "./zone-match";

/**
 * The delivery adapter core ships: zones drawn by hand or imported from a map.
 *
 * Zones are the only tariff. An address inside one is priced by it; an address
 * that cannot be placed, one outside every zone, and an installation with no
 * zones at all are each answered as a `Delivery` like any other — never thrown.
 *
 * `DeliveryZone` is this adapter's model and nobody else's. An installation that
 * wants a different tariff writes its own adapter against `DeliveryAdapter` and
 * points `DELIVERY_ADAPTER` at it. A different geocoder is `GEO_ADAPTER`, not a
 * delivery adapter.
 */
export class DefaultDeliveryAdapter extends DeliveryAdapter {
  public async checkAbility(address: OrderAddress): Promise<Delivery> {
    const match = await matchZone(address);

    if (match.zone) {
      return await describeZone(match.zone, match.location.diagnostics);
    }

    return await unmatchedZone(match);
  }

  public async calculate(order: OrderRecord): Promise<Delivery> {
    const match = await matchZone(order.address);

    if (match.zone) {
      return await applyZone(match.zone, order.basketTotal ?? 0, match.location.diagnostics);
    }

    return await unmatchedZone(match);
  }

  /**
   * Which of the candidate kitchens serves this coordinate, by delivery zone.
   *
   * A zone is bound to a kitchen by geometry, not by a stored link: the kitchen
   * whose coordinate lies inside the zone's polygon serves it. Zones come from
   * the same cached list `matchZone` reads, so the zone that names the kitchen
   * and the zone that prices the delivery are always the same one.
   *
   * The assumption, and its limit: a zone contains its kitchen. A satellite
   * zone drawn far from any kitchen binds to nobody here and falls through to
   * the next strategy in the chain.
   */
  public async resolvePlaceForCoordinate(
    coordinate: DeliveryCoordinate | null,
    candidates: PlaceCandidate[],
    diagnostics: string[] = [],
  ): Promise<string | null> {
    if (!coordinate || !candidates.length) return null;

    const zone = findZoneForCoordinate(await getServingZones(), coordinate);
    if (!zone) {
      diagnostics.push("coordinate is in no zone");
      return null;
    }

    const placeId = nearestPlaceInZone(zone, coordinate, candidates);
    if (!placeId) {
      diagnostics.push(`zone ${zone.id} contains no open kitchen`);
      return null;
    }

    diagnostics.push(`${placeId} via zone ${zone.id}`);
    return placeId;
  }
}
