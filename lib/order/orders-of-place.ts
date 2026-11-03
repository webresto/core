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
 * The selection is a query over `OrderStop` (C2) — one row per point with work to do, carrying a
 * copy of the order's state and times, indexed by `(place, orderState)` and `(place, completedAt)`.
 * `Order` itself has no column naming the leading point: a delivery keeps its kitchens in a json
 * list. {@link orderPlaceKey} still answers "which point is this order led by" for one record in
 * hand — the stops are how one *finds* the records.
 */

/** Orders no kitchen has been resolved for: an option of the `order-kanban` token, not a `Place`. */
export const NO_KITCHEN = "no-kitchen";

/** Work for a kitchen: placed, being cooked, on its way. */
export const ACTIVE_ORDER_STATES = ORDER_KITCHEN_PROGRESS_STATES;

/** How far back the «Завершённые» tab looks. */
export const DONE_WINDOW_DAYS = 7;

/** Upper bound of rows one selection reads; a safety net, not the shape of the query. */
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

/** The `where` of the stops of these points in one tab. `null` — nothing is granted. */
function stopsWhere(places: string | string[], tab: OrdersTab, now: number): Record<string, unknown> | null {
  const keys = [...new Set((Array.isArray(places) ? places : [places]).map(String))];
  if (!keys.length) return null;

  const ids = keys.filter((key) => key !== NO_KITCHEN);
  const unassigned = keys.includes(NO_KITCHEN);
  const where: Record<string, unknown> = tab === "done"
    ? { orderState: { in: ORDER_COMPLETED_STATES }, completedAt: { ">=": seconds(now - DONE_WINDOW_DAYS * 24 * 60 * 60 * 1000) } }
    : { orderState: { in: ACTIVE_ORDER_STATES } };

  // «Без кухни» is a stop whose point is null, so one query answers for both kinds of point.
  if (ids.length && unassigned) where.or = [{ place: { in: ids } }, { place: null }];
  else if (unassigned) where.place = null;
  else where.place = { in: ids };
  return where;
}

/**
 * The orders of these points, newest first. `places` are ids of `Place` and {@link NO_KITCHEN}; an
 * empty list means no point is granted and the answer is empty — never "all of them".
 *
 * An order routed over two kitchens has a stop at each, and a person holding both sees it once.
 */
export async function ordersOfPlace(
  places: string | string[],
  { tab = "active", since = null, limit = ORDERS_OF_PLACE_MAX, now = Date.now() }: OrdersOfPlaceQuery = {},
): Promise<OrderRecord[]> {
  const where = stopsWhere(places, tab, now);
  if (!where) return [];

  const stops = await OrderStop.find!({
    where,
    sort: tab === "done" ? [{ completedAt: "DESC" }, { updatedAt: "DESC" }] : [{ orderedAt: "DESC" }, { createdAt: "DESC" }],
    limit,
  } as any);

  const ids = [...new Set(stops.map((stop: any) => String(typeof stop.order === "object" ? stop.order.id : stop.order)))];
  if (!ids.length) return [];

  // `updatedAt` is epoch milliseconds (Waterline's autoUpdatedAt): the polling of the client asks
  // for what moved, and the stops carry no such copy on purpose — one column, one owner.
  const orderWhere: Record<string, unknown> = { id: { in: ids } };
  if (typeof since === "number" && Number.isFinite(since)) orderWhere.updatedAt = { ">=": since };
  const rows: OrderRecord[] = await Order.find!({ where: orderWhere } as any);

  // The order of the stops is the order of the answer: `Order.find` with `in` gives its own.
  const byId = new Map(rows.map((order) => [String(order.id), order]));
  return ids.map((id) => byId.get(id)).filter((order): order is OrderRecord => Boolean(order));
}

/** How many orders each tab of these points holds — the numbers on the chips. */
export async function countOrdersOfPlace(
  places: string | string[],
  { now = Date.now() }: Omit<OrdersOfPlaceQuery, "tab" | "since" | "limit"> = {},
): Promise<Record<OrdersTab, number>> {
  const counted = async (tab: OrdersTab) => {
    const where = stopsWhere(places, tab, now);
    if (!where) return 0;
    // One stop per point, so an order routed over two kitchens of the same person counts twice —
    // which is why the ids are counted and not the rows.
    const stops = await OrderStop.find!({ where, limit: ORDERS_OF_PLACE_MAX } as any);
    return new Set(stops.map((stop: any) => String(typeof stop.order === "object" ? stop.order.id : stop.order))).size;
  };
  const [active, done] = await Promise.all([counted("active"), counted("done")]);
  return { active, done };
}
