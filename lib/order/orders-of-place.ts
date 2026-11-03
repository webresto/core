import { OrderRecord } from "../../models/Order";
import { primaryCookingPoint, toPlaceId } from "../menu/cooking-place";
import { ORDER_KITCHEN_PROGRESS_STATES, ORDER_COMPLETED_STATES } from "./OrderStateFlow";

/**
 * The orders of one point — for the board of the admin panel and for the mobile application, by one
 * function (plan C1, C2).
 *
 * The point that leads an order is one: the kitchen the resolver assigned to a delivery, or the point
 * the customer chose for pickup and dine-in. An order whose kitchen is not resolved yet belongs
 * nowhere and is shown under {@link NO_KITCHEN} — the item the plan calls «Без кухни», from where it
 * is given a kitchen (`assignOrderKitchen`).
 *
 * Baskets are never here: `NEW`, `CART`, `CHECKOUT` and `PAYMENT` are a customer filling a basket,
 * not work for a kitchen. The states are core's own (`OrderStateFlow`), so the board, the phone and
 * the flow cannot drift apart.
 *
 * Until task C2 gives the order its stops (`OrderStop` with `(place, orderState)` indexed), the
 * selection is a bounded read of the active — or lately completed — orders of the whole chain,
 * filtered by point in memory: `Order` has no column naming the leading point, and `cookingPoints`
 * is a json list. {@link ORDERS_OF_PLACE_MAX} is that bound, and a chain busy enough to reach it
 * needs C2 rather than a larger number. When C2 lands, only the two functions below change.
 */

/** Orders no kitchen has been resolved for: an option of the `order-kanban` token, not a `Place`. */
export const NO_KITCHEN = "no-kitchen";

/** Work for a kitchen: placed, being cooked, on its way. */
export const ACTIVE_ORDER_STATES = ORDER_KITCHEN_PROGRESS_STATES;

/** How far back the «Завершённые» tab looks. */
export const DONE_WINDOW_DAYS = 7;

/** Upper bound of orders read before the point filter. */
export const ORDERS_OF_PLACE_MAX = 2000;

export type OrdersTab = "active" | "done";

export interface OrdersOfPlaceQuery {
  /** `active` — ORDER, COOKING, ON_THE_WAY; `done` — DONE and REJECT of the last {@link DONE_WINDOW_DAYS}. */
  tab?: OrdersTab;
  /** Only orders changed at or after this moment, epoch milliseconds: polling for what moved. */
  since?: number | null;
  /** Rows read before the point filter; {@link ORDERS_OF_PLACE_MAX} by default. */
  limit?: number;
  /** Now, epoch milliseconds — given by tests. */
  now?: number;
}

/**
 * The point that leads the order: the assigned kitchen of a delivery, the chosen point of pickup and
 * dine-in. `null` while a delivery has no kitchen.
 */
export function orderPlaceId(order: Partial<OrderRecord> | null | undefined): string | null {
  if (!order) return null;
  return order.serviceType && order.serviceType !== "delivery"
    ? toPlaceId(order.pickupPoint)
    : primaryCookingPoint(order as OrderRecord);
}

/** {@link orderPlaceId}, with {@link NO_KITCHEN} instead of `null`: the key the board groups by. */
export function orderPlaceKey(order: Partial<OrderRecord> | null | undefined): string {
  return orderPlaceId(order) ?? NO_KITCHEN;
}

/** Whether the order is led by one of these points (ids of `Place`, or {@link NO_KITCHEN}). */
export function orderIsOfPlace(order: Partial<OrderRecord> | null | undefined, places: Iterable<string>): boolean {
  const key = orderPlaceKey(order);
  for (const place of places) if (String(place) === key) return true;
  return false;
}

function seconds(milliseconds: number): number {
  return Math.floor(milliseconds / 1000);
}

function tabWhere(tab: OrdersTab, now: number, since?: number | null): Record<string, unknown> {
  const where: Record<string, unknown> = tab === "done"
    ? { state: { in: ORDER_COMPLETED_STATES }, completedAt: { ">=": seconds(now - DONE_WINDOW_DAYS * 24 * 60 * 60 * 1000) } }
    : { state: { in: ACTIVE_ORDER_STATES } };
  // `updatedAt` is epoch milliseconds (Waterline's autoUpdatedAt), `completedAt` is seconds.
  if (typeof since === "number" && Number.isFinite(since)) where.updatedAt = { ">=": since };
  return where;
}

/**
 * The orders of these points, newest first. `places` are ids of `Place` and {@link NO_KITCHEN}; an
 * empty list means no point is granted and the answer is empty — never "all of them".
 */
export async function ordersOfPlace(
  places: string | string[],
  { tab = "active", since = null, limit = ORDERS_OF_PLACE_MAX, now = Date.now() }: OrdersOfPlaceQuery = {},
): Promise<OrderRecord[]> {
  const keys = new Set((Array.isArray(places) ? places : [places]).map(String));
  if (!keys.size) return [];

  const rows: OrderRecord[] = await Order.find!({
    where: tabWhere(tab, now, since),
    sort: tab === "done" ? [{ completedAt: "DESC" }, { updatedAt: "DESC" }] : [{ orderedAt: "DESC" }, { createdAt: "DESC" }],
    limit,
  } as any);

  return rows.filter((order) => keys.has(orderPlaceKey(order)));
}

/** How many orders each tab of these points holds — the numbers on the chips. */
export async function countOrdersOfPlace(
  places: string | string[],
  { limit = ORDERS_OF_PLACE_MAX, now = Date.now() }: Omit<OrdersOfPlaceQuery, "tab" | "since"> = {},
): Promise<Record<OrdersTab, number>> {
  const [active, done] = await Promise.all([
    ordersOfPlace(places, { tab: "active", limit, now }),
    ordersOfPlace(places, { tab: "done", limit, now }),
  ]);
  return { active: active.length, done: done.length };
}
