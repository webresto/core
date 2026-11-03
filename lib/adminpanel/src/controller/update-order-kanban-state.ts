import { getAllowedOrderTransitionsByRole, isOperatorUser } from "../../../order/OrderStateFlow";
import { transitionOrder } from "../../../order/transitionOrder";
import { orderIsOfPlace, orderPlaceKey } from "../../../order/orders-of-place";
import { requireOrderKanbanAccess } from "./access-rights";
import { kanbanPlacesOf } from "./order-kanban-places";

function mapOrder(order: any, operatorLimited: boolean) {
  const customer = order?.customer && typeof order.customer === "object" ? order.customer : {};
  const phone = customer?.phone && typeof customer.phone === "object"
    ? `${customer.phone.code || ""}${customer.phone.number || ""}`
    : "";
  const state = order?.state || "NEW";

  const dishesCount = typeof order?.dishesCount === "number"
    ? order.dishesCount
    : Array.isArray(order?.dishes) ? order.dishes.length : 0;

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
    rmsOrderNumber: order?.rmsOrderNumber || "",
    createdAt: order?.createdAt || null,
    updatedAt: order?.updatedAt || null,
    closedAt: ["DONE", "REJECT"].includes(state) ? (order?.updatedAt || null) : null,
    date: order?.date || null,
    placeId: orderPlaceKey(order),
    allowedTransitions: getAllowedOrderTransitionsByRole(state, operatorLimited),
  };
}

/**
 * «Move to…» of the orders board.
 *
 * The move itself is core's `transitionOrder` (plan C5) — the same function the mobile application
 * calls, so the board and the phone cannot answer differently about the same order. What is left
 * here is the board's own business: who is asking, which points they hold, and the HTTP answer.
 */
export default async function UpdateOrderKanbanStateController(req: any, res: any) {
  const t = (key: string, params?: any) => (req?.i18n?.__ ? req.i18n.__(key, params) : key);
  try {
    if (!(await requireOrderKanbanAccess(req, res))) return;
    const allowedPlaces = await kanbanPlacesOf(req, res);
    if (allowedPlaces === false) return;

    const { id, nextState } = req.body || {};
    if (!id || typeof id !== "string") {
      return res.status(400).json({ error: t("Invalid order id") });
    }

    const order = await Order.findOne!({ id });
    if (!order) {
      return res.status(404).json({ error: t("Order not found") });
    }
    // An order of a point the user does not hold does not exist for them, by id as in the list.
    if (allowedPlaces !== null && !orderIsOfPlace(order, allowedPlaces)) {
      return res.status(404).json({ error: t("Order not found") });
    }

    const result = await transitionOrder({ id }, nextState, { user: req.user, source: "order-kanban" });
    const operatorLimited = isOperatorUser(req.user);

    if (result.ok) {
      return res.json({ success: true, order: mapOrder(result.order, operatorLimited) });
    }
    switch (result.reason) {
      case "invalid_state":
        return res.status(400).json({ error: t("Invalid next state") });
      case "not_found":
        return res.status(404).json({ error: t("Order not found") });
      case "forbidden":
        return res.status(403).json({
          error: t("Forbidden transition: %s", `${result.from} -> ${nextState}`),
          allowedTransitions: result.allowedTransitions,
        });
      default:
        return res.status(400).json({ error: result.message });
    }
  } catch (error) {
    sails.log.error("Update order kanban state error", error);
    return res.status(500).json({ error: String(error) });
  }
}
