import OrderAddress from "../../../interfaces/OrderAddress";
import { OrderRecord } from "../../../models/Order";
import DeliveryAdapter from "../DeliveryAdapter";
import { Delivery } from "../contracts";
import { applyZone, describeZone, matchZone, unmatchedZone } from "./zone-calculation";

/**
 * The delivery adapter core falls back to: zones drawn by hand or imported from
 * a map.
 *
 * Zones are the only tariff. An address inside one is priced by it; an address
 * that cannot be placed, one outside every zone, and an installation with no
 * zones at all are each answered as a `Delivery` like any other — never thrown.
 *
 * An installation that wants different zones writes its own adapter against
 * `DeliveryAdapter` and points `DELIVERY_ADAPTER` at it; the zone machinery in
 * this folder stays available to it as plain functions. A different geocoder is
 * `GEO_ADAPTER`, not a delivery adapter.
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
}
