import { Adapter } from "../adapters";
import { DeliveryCoordinate } from "../adapters/delivery/contracts";
import { OrderRecord } from "../models/Order";
import { toPlaceId } from "./cooking-place";
import { locateAddress } from "./delivery-location";
import { KitchenResolution, resolveCookingPlace } from "./kitchen-resolver";

/**
 * Giving an order its kitchen.
 *
 * The resolver answers *which* kitchen; this answers *whether the one already
 * there may be replaced*, and the two are deliberately separate questions.
 *
 * Whether it may be replaced is answered here rather than by a chain entry: a
 * chain entry can be left out of the setting, and "a placed order keeps its
 * kitchen" is not a policy an installation gets to switch off.
 *
 * Nothing here writes to the database. The caller is mid-recalculation and saves
 * the order once, at the end, with the delivery result — the plan asks for the
 * delivery and the cooking point to land atomically, and two writes here would
 * be exactly the intermediate state it is trying to avoid.
 */

/**
 * Journal messages for kitchen decisions.
 *
 * Constants because two readers now depend on them: the recalculation writes
 * them and the operator card reads them back to show what happened. A string
 * literal in both places would drift the first time one of them is reworded, and
 * the card would quietly go blank instead of failing.
 */
export const KITCHEN_LOG = {
  assigned: "countCart: cooking point assigned",
  dropped: "countCart: products dropped by kitchen change",
} as const;

export interface CookingPlaceAssignment {
  /** The kitchen the order should now have. */
  placeId: string | null;
  previousPlaceId: string | null;
  /** Whether this recalculation moved the order to a different kitchen. */
  changed: boolean;
  /** Where the customer is, once resolved by iteration 3's rules. */
  coordinate: DeliveryCoordinate | null;
  resolution: KitchenResolution | null;
}

const UNCHANGED = (order: OrderRecord, reason: string): CookingPlaceAssignment => {
  const current = toPlaceId(order.cookingPoint);
  return {
    placeId: current,
    previousPlaceId: current,
    changed: false,
    coordinate: null,
    resolution: { placeId: current, strategy: null, diagnostics: [reason] },
  };
};

/**
 * Resolves the kitchen for an order being recalculated and reports what changed.
 *
 * The address is turned into a coordinate through iteration 3's rule and nothing
 * else: a client coordinate, an organization's coordinate, or a geocoded
 * street-and-house pair. Free text naming an organization is never handed to a
 * geocoder, so "Памятник Ленину" cannot become a delivery address by accident.
 *
 * The resolved coordinate is written back onto the address. That is not a
 * convenience — the delivery calculation runs later in the same recalculation and
 * would otherwise geocode the identical address a second time.
 */
export async function assignOrderCookingPlace(order: OrderRecord): Promise<CookingPlaceAssignment> {
  // A placed order is not re-routed. The kitchen has already been told what to
  // cook; moving it now would leave two kitchens with two truths.
  if (Order.isOrderedState(String(order.state))) {
    return UNCHANGED(order, "order is already placed, its kitchen is not reassigned");
  }

  const previousPlaceId = toPlaceId(order.cookingPoint);
  let coordinate: DeliveryCoordinate | null = null;

  if (order.selfService !== true) {
    const adapter = await Adapter.getDeliveryAdapter();

    const location = await locateAddress(adapter, order.address);
    coordinate = location.coordinate;

    if (coordinate && order.address) {
      // Stored as strings because that is what `Address.coordinate` has always
      // been; the reader parses either form.
      order.address = {
        ...order.address,
        coordinate: { lat: String(coordinate.lat), lon: String(coordinate.lng) },
      };
    }
  }

  const resolution = await resolveCookingPlace({
    coordinate,
    pickupPointId: toPlaceId(order.pickupPoint),
    selfService: order.selfService === true,
  });

  return {
    placeId: resolution.placeId,
    previousPlaceId,
    changed: resolution.placeId !== previousPlaceId,
    coordinate,
    resolution,
  };
}
