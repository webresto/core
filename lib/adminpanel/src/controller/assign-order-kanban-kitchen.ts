import { assignOrderKitchen } from "../../../order/assignKitchen";
import { orderIsOfPlace } from "../../../order/orders-of-place";
import { NO_KITCHEN } from "../../order-kanban-rights";
import { requireOrderKanbanAccess, hasOrderKanbanPlaceAccess } from "./access-rights";
import { kanbanPlacesOf } from "./order-kanban-places";

/**
 * «Назначить кухню» of the orders board (plan C6): an order that reached the staff without a kitchen
 * is given the one that will cook it.
 *
 * Two points are checked, not one: «Без кухни», because that is where the order is now and only its
 * holder may take it from there, and the kitchen being given, because handing an order to a point
 * one does not hold is handing it away.
 */
export default async function AssignOrderKanbanKitchenController(req: any, res: any) {
  const t = (key: string) => (req?.i18n?.__ ? req.i18n.__(key) : key);
  try {
    if (!(await requireOrderKanbanAccess(req, res))) return;
    const { id, placeId } = req.body || {};
    if (!id || typeof id !== "string") return res.status(400).json({ error: t("Invalid order id") });
    if (!placeId || typeof placeId !== "string") return res.status(400).json({ error: t("Invalid point") });

    // The points of the person, never the point in the body: that one is the kitchen being given.
    const allowedPlaces = await kanbanPlacesOf(req, res, "");
    if (allowedPlaces === false) return;
    if (allowedPlaces !== null && !allowedPlaces.includes(NO_KITCHEN)) return res.sendStatus(403);
    if (!(await hasOrderKanbanPlaceAccess(req, placeId))) return res.sendStatus(403);

    const order = await Order.findOne!({ id });
    if (!order) return res.status(404).json({ error: t("Order not found") });
    if (allowedPlaces !== null && !orderIsOfPlace(order, allowedPlaces)) {
      return res.status(404).json({ error: t("Order not found") });
    }

    const result = await assignOrderKitchen({ id }, placeId, { user: req.user, source: "order-kanban" });
    if (result.ok) return res.json({ success: true, placeId: result.placeId });
    switch (result.reason) {
      case "not_found":
        return res.status(404).json({ error: t("Order not found") });
      case "no_such_place":
        return res.status(400).json({ error: t("Invalid point") });
      case "not_assignable":
        return res.status(409).json({ error: t("This order is collected at the point the customer chose") });
      default:
        return res.status(409).json({ error: t("The order already has a kitchen") });
    }
  } catch (error) {
    sails.log.error("Assign order kanban kitchen error", error);
    return res.status(500).json({ error: String(error) });
  }
}
