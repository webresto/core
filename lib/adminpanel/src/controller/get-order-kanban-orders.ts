import {
  ORDER_KANBAN_DEFAULT_NEW_WINDOW_MINUTES,
  ORDER_OPERATOR_ALLOWED_TARGET_STATES,
  getAllowedOrderTransitionsByRole,
  isCompletedOrderState,
  isOperatorUser,
} from "../../../../libs/OrderStateFlow";

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

function mapOrder(order: any, operatorLimited: boolean) {
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
    selfService: Boolean(order?.selfService),
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
    const { config } = req.adminizer || {};
    if (config?.auth?.enable && !req.user) {
      return res.redirect(`${config.routePrefix}/model/userap/login`);
    } else if (req.adminizer?.accessRightsHelper && !req.adminizer.accessRightsHelper.hasPermission(`order-kanban`, req.user)) {
      return res.sendStatus(403);
    }

    const requestedLimit = Number.parseInt(String(req.query.limit || "250"), 10);
    const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 500) : 250;
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
        where: { orderedAt: { '>=': newSinceSeconds } },
        sort: "orderedAt DESC",
        limit,
      }),
      Order.find({
        where: { orderedAt: null, createdAt: { '>=': new Date(newSinceMs) } },
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

    const filteredByQuery = q
      ? filteredByState.filter((order: any) => {
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
      : filteredByState;

    return res.json({
      results: filteredByQuery.map((order: any) => mapOrder(order, operatorLimited)),
      meta: {
        newWindowMinutes,
        newSince: new Date(newSinceMs).toISOString(),
        completedSince: new Date(completedSinceMs).toISOString(),
        operatorLimited,
        operatorAllowedTargets: ORDER_OPERATOR_ALLOWED_TARGET_STATES,
      }
    });
  } catch (error) {
    sails.log.error("Get order kanban orders error", error);
    return res.status(500).json({ error: String(error) });
  }
}
