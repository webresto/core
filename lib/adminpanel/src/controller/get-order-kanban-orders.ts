import {
  ORDER_KANBAN_DEFAULT_NEW_WINDOW_MINUTES,
  ORDER_OPERATOR_ALLOWED_TARGET_STATES,
  getAllowedOrderTransitionsByRole,
  isCompletedOrderState,
  isOperatorUser,
} from "../../../order/OrderStateFlow";
import { courierRoute } from "../../../menu/cooking-place";
import { ORDERS_OF_PLACE_MAX, orderIsOfPlace, orderPlaceId, orderPlaceKey } from "../../../order/orders-of-place";
import { requireOrderKanbanAccess } from "./access-rights";
import { kanbanPlacesOf } from "./order-kanban-places";

// Non-completed states that the kanban board actually renders as columns
// (mirrors VISIBLE_BOARD_STATES minus DONE/REJECT on the frontend).
// Pre-order states (NEW, CART, PAYMENT) are excluded: those are mostly empty
// guest carts that otherwise flood the result set and consume the query limit,
// pushing real active orders out of the board.
const ACTIVE_BOARD_STATES = ["CHECKOUT", "ORDER", "COOKING", "ON_THE_WAY"];

function parseNewWindowMinutes(rawValue: unknown): number {
  const parsed = Number.parseInt(String(rawValue || ORDER_KANBAN_DEFAULT_NEW_WINDOW_MINUTES), 10);
  if (!Number.isFinite(parsed)) return ORDER_KANBAN_DEFAULT_NEW_WINDOW_MINUTES;
  return Math.min(Math.max(parsed, 1), 1440);
}

function parseTimestamp(value: unknown): number {
  const timestamp = new Date(value as any).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function getCompletedOrderTimestampMs(order: any): number {
  const completedAtMs = typeof order?.completedAt === "number" && order.completedAt > 0
    ? order.completedAt * 1000
    : 0;
  const directTimestamp = Math.max(
    completedAtMs,
    parseTimestamp(order?.closedAt),
    parseTimestamp(order?.doneAt),
    parseTimestamp(order?.rejectAt),
  );
  if (directTimestamp > 0) return directTimestamp;

  const logs = Array.isArray(order?.logs) ? order.logs : [];
  let completedTimestamp = 0;
  for (const entry of logs) {
    const message = String(entry?.message || "");
    const targetState = String(entry?.data?.to || "");
    const timestamp = parseTimestamp(entry?.timestamp);
    if (!timestamp) continue;

    if (
      (message === "order-kanban: state changed" && isCompletedOrderState(targetState)) ||
      message === "doFinalize: DONE" ||
      message === "doFinalize: REJECT"
    ) {
      completedTimestamp = Math.max(completedTimestamp, timestamp);
    }
  }

  return completedTimestamp;
}

function resolveClosedAt(order: any): string | null {
  if (!isCompletedOrderState(order?.state)) return null;
  const timestamp = getCompletedOrderTimestampMs(order);
  return timestamp > 0 ? new Date(timestamp).toISOString() : null;
}

function isOrderInCompletedWindow(order: any, sinceMs: number): boolean {
  return getCompletedOrderTimestampMs(order) >= sinceMs;
}

function isOrderInActiveWindow(order: any, sinceMs: number): boolean {
  const orderedAtMs = order?.orderedAt
    ? order.orderedAt * 1000
    : parseTimestamp(order?.createdAt);
  return orderedAtMs >= sinceMs;
}

function mapOrder(
  order: any,
  operatorLimited: boolean,
  placeNames: Map<string, string>,
) {
  const customer = order?.customer && typeof order.customer === "object" ? order.customer : {};
  const phone = customer?.phone && typeof customer.phone === "object"
    ? `${customer.phone.code || ""}${customer.phone.number || ""}`
    : "";

  const dishesCount = typeof order?.dishesCount === "number"
    ? order.dishesCount
    : Array.isArray(order?.dishes) ? order.dishes.length : 0;

  const state = order?.state || "NEW";
  return {
    id: order?.id,
    shortId: order?.shortId || String(order?.id || "").slice(-8),
    state,
    total: typeof order?.total === "number" ? order.total : 0,
    dishesCount,
    customerName: customer?.name || "",
    customerPhone: phone,
    comment: order?.comment || "",
    tag: order?.tag || "",
    paid: Boolean(order?.paid),
    serviceType: order?.serviceType || "delivery",
    kitchenName: placeNames.get(orderPlaceId(order) ?? "") || "",
    /** The point the order is led by, or `no-kitchen`: the column of the point switch. */
    placeId: orderPlaceKey(order),
    // Every kitchen the courier collects from, in driving order; empty for an
    // order cooked in one place.
    route: courierRoute(order).map((id) => placeNames.get(id) || id),
    zoneName: order?.delivery?.zoneName || "",
    rmsOrderNumber: order?.rmsOrderNumber || "",
    orderedAt: order?.orderedAt || null,
    createdAt: order?.createdAt || null,
    updatedAt: order?.updatedAt || null,
    closedAt: resolveClosedAt(order),
    date: order?.date || null,
    allowedTransitions: getAllowedOrderTransitionsByRole(state, operatorLimited),
  };
}

export default async function GetOrderKanbanOrdersController(req: any, res: any) {
  try {
    if (!(await requireOrderKanbanAccess(req, res))) return;
    const allowedPlaces = await kanbanPlacesOf(req, res);
    if (allowedPlaces === false) return;

    const requestedLimit = Number.parseInt(String(req.query.limit || "250"), 10);
    const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), ORDERS_OF_PLACE_MAX) : 250;
    const includeDone = String(req.query.includeDone || "0") === "1";
    const newWindowMinutes = parseNewWindowMinutes(req.query.newMinutes);
    const newSinceMs = Date.now() - newWindowMinutes * 60 * 1000;
    const completedSinceMs = newSinceMs;
    const q = String(req.query.q || "").trim().toLowerCase();
    const operatorLimited = isOperatorUser(req.user);

    const newSinceSeconds = Math.floor(newSinceMs / 1000);
    const completedSinceSeconds = Math.floor(completedSinceMs / 1000);

    const [ordersWithOrderedAt, ordersWithoutOrderedAt, completedOrders] = await Promise.all([
      Order.find({
        where: { state: { in: ACTIVE_BOARD_STATES }, orderedAt: { '>=': newSinceSeconds } },
        sort: "orderedAt DESC",
        limit,
      }),
      Order.find({
        where: { state: { in: ACTIVE_BOARD_STATES }, orderedAt: null, createdAt: { '>=': newSinceMs } },
        sort: "createdAt DESC",
        limit,
      }),
      includeDone
        ? Order.find({
          where: { completedAt: { '>=': completedSinceSeconds } },
          sort: "completedAt DESC",
          limit,
        })
        : Promise.resolve([]),
    ]);

    const seenIds = new Set<string>();
    const rawOrders: any[] = [];
    for (const order of [...ordersWithOrderedAt, ...ordersWithoutOrderedAt, ...completedOrders]) {
      if (!seenIds.has(order.id)) {
        seenIds.add(order.id);
        rawOrders.push(order);
      }
    }

    const filteredByState = rawOrders.filter((order: any) => {
      const state = String(order?.state || "");
      if (isCompletedOrderState(state)) {
        if (!includeDone) return false;
        return isOrderInCompletedWindow(order, completedSinceMs);
      }
      return isOrderInActiveWindow(order, newSinceMs);
    });

    // Only the points of this request. Until C2 gives an order its stops, `Order` has no column
    // naming its point, so the filter is this pass in memory over a bounded read.
    const filteredByPlace = allowedPlaces === null
      ? filteredByState
      : filteredByState.filter((order: any) => orderIsOfPlace(order, allowedPlaces));

    const filteredByQuery = q
      ? filteredByPlace.filter((order: any) => {
        const customer = order?.customer && typeof order.customer === "object" ? order.customer : {};
        const phone = customer?.phone && typeof customer.phone === "object"
          ? `${customer.phone.code || ""}${customer.phone.number || ""}`
          : "";
        const haystack = [
          order?.id,
          order?.shortId,
          order?.state,
          order?.tag,
          order?.rmsOrderNumber,
          customer?.name,
          phone,
          order?.comment,
        ].map((item) => String(item || "").toLowerCase()).join(" ");
        return haystack.includes(q);
      })
      : filteredByPlace;

    // The kitchen is a card caption, collected in one query for the whole list
    // rather than one per card. The zone's name came with the delivery result.
    const placeIds = new Set<string>();
    for (const order of filteredByQuery) {
      const placeId = orderPlaceId(order);
      if (placeId) placeIds.add(placeId);
      for (const stop of courierRoute(order)) placeIds.add(stop);
    }

    const places = placeIds.size ? await Place.find({ id: Array.from(placeIds) }) : [];
    const placeNames = new Map<string, string>(
      places.map((place: any) => [String(place.id), String(place.title || place.address || "")]),
    );

    return res.json({
      results: filteredByQuery.map((order: any) => mapOrder(order, operatorLimited, placeNames)),
      meta: {
        newWindowMinutes,
        newSince: new Date(newSinceMs).toISOString(),
        completedSince: new Date(completedSinceMs).toISOString(),
        operatorLimited,
        operatorAllowedTargets: ORDER_OPERATOR_ALLOWED_TARGET_STATES,
        places: allowedPlaces,
      }
    });
  } catch (error) {
    sails.log.error("Get order kanban orders error", error);
    return res.status(500).json({ error: String(error) });
  }
}
