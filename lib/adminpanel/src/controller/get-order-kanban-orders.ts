const ORDER_TRANSITIONS: Record<string, string[]> = {
  NEW: ["CART"],
  CART: ["CHECKOUT", "REJECT"],
  CHECKOUT: ["CART", "PAYMENT", "ORDER", "REJECT"],
  PAYMENT: ["CART", "ORDER", "CHECKOUT", "REJECT"],
  ORDER: ["COOKING", "ON_THE_WAY", "DONE", "REJECT"],
  COOKING: ["ON_THE_WAY", "DONE", "REJECT"],
  ON_THE_WAY: ["DONE", "REJECT"],
  DONE: [],
  REJECT: []
};
const OPERATOR_ALLOWED_TARGET_STATES = ["REJECT", "COOKING", "ON_THE_WAY", "DONE"];
const COMPLETED_STATES = new Set(["DONE", "REJECT"]);
const DEFAULT_COMPLETED_WINDOW_HOURS = 24;
const DEFAULT_NEW_WINDOW_MINUTES = 15;

function parseCompletedWindowHours(rawValue: unknown): number {
  const parsed = Number.parseInt(String(rawValue || DEFAULT_COMPLETED_WINDOW_HOURS), 10);
  if (!Number.isFinite(parsed)) return DEFAULT_COMPLETED_WINDOW_HOURS;
  return Math.min(Math.max(parsed, 1), 168);
}

function parseNewWindowMinutes(rawValue: unknown): number {
  const parsed = Number.parseInt(String(rawValue || DEFAULT_NEW_WINDOW_MINUTES), 10);
  if (!Number.isFinite(parsed)) return DEFAULT_NEW_WINDOW_MINUTES;
  return Math.min(Math.max(parsed, 1), 1440);
}

function parseTimestamp(value: unknown): number {
  const timestamp = new Date(value as any).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function isOrderInCompletedWindow(order: any, sinceMs: number): boolean {
  const createdAtMs = parseTimestamp(order?.createdAt);
  const updatedAtMs = parseTimestamp(order?.updatedAt);
  return createdAtMs >= sinceMs || updatedAtMs >= sinceMs;
}

function isOrderInNewWindow(order: any, sinceMs: number): boolean {
  const createdAtMs = parseTimestamp(order?.createdAt);
  return createdAtMs >= sinceMs;
}

function getUserGroupNames(user: any): string[] {
  if (!Array.isArray(user?.groups)) return [];
  return user.groups
    .map((group: any) => String(group?.name || "").trim().toLowerCase())
    .filter((name: string) => name.length > 0);
}

function isOperatorUser(user: any): boolean {
  if (user?.isAdministrator) return false;
  const names = getUserGroupNames(user);
  return names.some((name) => (
    name === "operator" ||
    name.includes("operator") ||
    name.includes("оператор")
  ));
}

function getAllowedTransitions(state: string, operatorLimited: boolean): string[] {
  const normalizedState = String(state || "");
  if (operatorLimited) {
    return OPERATOR_ALLOWED_TARGET_STATES.filter((targetState) => targetState !== normalizedState);
  }
  return ORDER_TRANSITIONS[normalizedState] || [];
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
    createdAt: order?.createdAt || null,
    updatedAt: order?.updatedAt || null,
    date: order?.date || null,
    allowedTransitions: getAllowedTransitions(state, operatorLimited),
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
    const completedWindowHours = parseCompletedWindowHours(req.query.completedHours);
    const newWindowMinutes = parseNewWindowMinutes(req.query.newMinutes);
    const completedSinceMs = Date.now() - completedWindowHours * 60 * 60 * 1000;
    const newSinceMs = Date.now() - newWindowMinutes * 60 * 1000;
    const q = String(req.query.q || "").trim().toLowerCase();
    const operatorLimited = isOperatorUser(req.user);

    const rawOrders = await Order.find({
      sort: "updatedAt DESC",
      limit,
    });

    const filteredByState = rawOrders.filter((order: any) => {
      const state = String(order?.state || "");
      if (state === "NEW") {
        return isOrderInNewWindow(order, newSinceMs);
      }
      if (!includeDone && COMPLETED_STATES.has(state)) {
        return false;
      }
      if (includeDone && COMPLETED_STATES.has(state)) {
        return isOrderInCompletedWindow(order, completedSinceMs);
      }
      return true;
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
        completedWindowHours,
        completedSince: new Date(completedSinceMs).toISOString(),
        operatorLimited,
        operatorAllowedTargets: OPERATOR_ALLOWED_TARGET_STATES,
      }
    });
  } catch (error) {
    sails.log.error("Get order kanban orders error", error);
    return res.status(500).json({ error: String(error) });
  }
}
