import { Adapter } from "../../adapters";
import { DeliveryCoordinate } from "../../interfaces/Delivery";
import { OrderRecord } from "../../models/Order";
import { primaryCookingPoint, toPlaceId } from "../menu/cooking-place";
import { KitchenResolution } from "../../interfaces/Menu";

/**
 * Giving an order its kitchen.
 *
 * The menu adapter's `resolveCookingPlace` answers *which* kitchen; this turns
 * the order's address into the coordinate it asks about and reports whether the
 * answer moved the order. Only a basket gets here: `countCart` refuses every
 * state outside CART, CHECKOUT and PAYMENT before asking.
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
  resolution: KitchenResolution;
}

/**
 * Resolves the kitchen for an order being recalculated and reports what changed.
 *
 * The address is turned into a coordinate by the geo adapter's `locate` and
 * nothing else: the coordinate the client sent, the point of the catalog node
 * they chose, or a street-and-house pair geocoded by the geo adapter.
 *
 * The resolved coordinate is written back onto the address. That is not a
 * convenience — the delivery calculation runs later in the same recalculation and
 * would otherwise geocode the identical address a second time.
 */
export async function assignOrderCookingPlace(order: OrderRecord): Promise<CookingPlaceAssignment> {
  const previousPlaceId = primaryCookingPoint(order);
  let coordinate: DeliveryCoordinate | null = null;

  if (order.serviceType === "delivery") {
    const location = await (await Adapter.get("geo")).locate(order.address);
    coordinate = location.coordinate;

    if (coordinate && order.address) {
      order.address = { ...order.address, coordinate };
    }
  }

  const resolution = await (await Adapter.get("menu")).resolveCookingPlace({
    coordinate,
    pickupPointId: toPlaceId(order.pickupPoint),
    serviceType: order.serviceType,
  });

  return {
    placeId: resolution.placeId,
    previousPlaceId,
    changed: resolution.placeId !== previousPlaceId,
    coordinate,
    resolution,
  };
}
