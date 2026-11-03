import { OrderRecord } from "../../models/Order";
import { primaryCookingPoint } from "../menu/cooking-place";
import { NO_KITCHEN, orderPlaceKey } from "./orders-of-place";
import { syncOrderStops } from "./order-stops";

/**
 * Giving a placed order the kitchen that will cook it (plan C6).
 *
 * An order can reach the staff without one: no kitchen takes its address, or the chain let it
 * through with soft calculation for an operator to decide. Such an order belongs to no point and
 * hangs under «Без кухни» ({@link NO_KITCHEN}); until now nothing anywhere could move it out.
 *
 * Only a placed order that has no kitchen yet, and only to an enabled cooking point. Reassigning a
 * kitchen that is already cooking is not this: the basket was counted against that kitchen's menu
 * and prices, and moving it would need the recount of C3's routing.
 *
 * The basket is not recounted here either. The order is placed, the customer has been told its
 * total, and an operator assigning the kitchen that will cook it must not silently change what it
 * costs. A kitchen that cannot make something tells the operator, who rejects the order.
 */

export interface AssignKitchenRequest {
  /** The member of staff asking. Goes to the journal. */
  user: unknown;
  /** Who is asking: `order-kanban` for the board, `mobile-api` for the phone. */
  source: string;
  data?: Record<string, unknown>;
}

export type AssignKitchenResult =
  | { ok: true; order: OrderRecord; placeId: string }
  | { ok: false; reason: "not_found" }
  | { ok: false; reason: "no_such_place" }
  /** Pickup and dine-in have the point the customer chose; a kitchen is not ours to give. */
  | { ok: false; reason: "not_assignable" }
  | { ok: false; reason: "already_assigned"; placeId: string };

export const KITCHEN_ASSIGNED_MESSAGE = "kitchen assigned";

export async function assignOrderKitchen(
  criteria: string | { id: string },
  placeId: string,
  { user, source, data = {} }: AssignKitchenRequest,
): Promise<AssignKitchenResult> {
  const query = typeof criteria === "string" ? { id: criteria } : criteria;
  const order: OrderRecord | undefined = await Order.findOne!(query);
  if (!order) return { ok: false, reason: "not_found" };
  if (order.serviceType && order.serviceType !== "delivery") return { ok: false, reason: "not_assignable" };
  if (orderPlaceKey(order) !== NO_KITCHEN) {
    return { ok: false, reason: "already_assigned", placeId: orderPlaceKey(order) };
  }

  const place = placeId ? await Place.findOne!({ id: String(placeId) }) : null;
  if (!place || place.isCookingPoint !== true || place.enable === false) return { ok: false, reason: "no_such_place" };

  await Order.update!({ id: order.id }, { cookingPoints: [String(place.id)] }).fetch();
  // The order leaves «Без кухни» for that kitchen: its stop moves with it (plan C2).
  await syncOrderStops({ id: String(order.id) });
  await Order.log!({ id: order.id }, "info", source, `${source}: ${KITCHEN_ASSIGNED_MESSAGE}`, {
    placeId: String(place.id),
    placeTitle: place.title ?? null,
    byUserId: (user as any)?.id ?? null,
    ...data,
  });

  const assigned: OrderRecord | undefined = await Order.findOne!({ id: order.id });
  if (!assigned) return { ok: false, reason: "not_found" };
  return { ok: true, order: assigned, placeId: primaryCookingPoint(assigned) ?? String(place.id) };
}
