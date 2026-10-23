import { Adapter } from "../../adapters";
import { Delivery, DeliveryCoordinate } from "../../interfaces/Delivery";
import OrderAddress from "../../interfaces/OrderAddress";
import { OrderRecord } from "../../models/Order";
import { primaryCookingPoint, toPlaceId } from "../menu/cooking-place";
import { KitchenResolution } from "../../interfaces/Menu";
import type { WorkTime } from "@webresto/worktime";

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
    city: order.address?.city ?? null,
    // an order by time is cooked by a kitchen open then, as its menu is read (MenuAdapter, `withoutClosedPoints`)
    at: order.date ? new Date(order.date) : null,
  });

  return {
    placeId: resolution.placeId,
    previousPlaceId,
    changed: resolution.placeId !== previousPlaceId,
    coordinate,
    resolution,
  };
}

/** `WorkTime.dayOfWeek` by `Date.getDay()` */
const WEEK = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

/** "YYYY-MM-DD HH:mm" by the process clock (the restaurant's): the format of `Order.date` */
function orderDate(moment: Date): string {
  const two = (value: number) => String(value).padStart(2, "0");
  return `${moment.getFullYear()}-${two(moment.getMonth() + 1)}-${two(moment.getDate())} ${two(moment.getHours())}:${two(moment.getMinutes())}`;
}

/**
 * When a kitchen takes a delivery to a coordinate - the answer about an address before there is an order (the address
 * window of a storefront): `null` - one takes it now; the order date of the first opening of a kitchen within a week
 * after which the chain takes it (asked as for an order by that time, `KitchenResolveRequest.at`); `undefined` - none
 * takes it within a week (switched off, none for the area).
 */
export async function kitchenOpensAt(coordinate: DeliveryCoordinate, city: string | null, now: Date = new Date()): Promise<string | null | undefined> {
  const menu = await Adapter.get("menu");
  const takes = async (at: Date) => !!(await menu.resolveCookingPlace({ serviceType: "delivery", coordinate, city, at })).placeId;
  if (await takes(now)) return null;

  const openings = new Set<number>();
  for (const place of await Place.find!({ enable: true, isCookingPoint: true })) {
    for (const hours of (place.worktime ?? []) as WorkTime[]) {
      const [hour, minute] = String(hours.start).split(":").map(Number);
      for (let day = 0; day <= 7; day++) {
        const moment = new Date(now);
        moment.setDate(moment.getDate() + day);
        moment.setHours(hour, minute, 0, 0);
        if (moment > now && hours.dayOfWeek?.includes(WEEK[moment.getDay()] as any)) openings.add(moment.getTime());
      }
    }
  }
  for (const moment of [...openings].sort((a, b) => a - b)) {
    if (await takes(new Date(moment))) return orderDate(new Date(moment));
  }
  return undefined;
}

/**
 * The answer about an address alone (`checkDeliveryAbility`): the delivery adapter's terms, and - as checkout will
 * refuse an order no kitchen takes (`NO_KITCHEN`) unless soft calculation hands it to an operator - whether a kitchen
 * takes it: closed now - `kitchenOpensAt`; none within a week - refused.
 */
export async function deliveryForAddress(address: OrderAddress): Promise<Delivery> {
  const delivery = await (await Adapter.get("delivery")).checkAbility(address);
  if (delivery.allowed === false || (await Settings.get("SOFT_DELIVERY_CALCULATION")) !== false) return delivery;

  const coordinate = (await (await Adapter.get("geo")).locate(address)).coordinate;
  if (!coordinate) return delivery;
  const opensAt = await kitchenOpensAt(coordinate, address.city ?? null);
  if (opensAt === undefined) return { ...delivery, allowed: false, message: "No kitchen delivers to this address now" };
  return { ...delivery, kitchenOpensAt: opensAt };
}
