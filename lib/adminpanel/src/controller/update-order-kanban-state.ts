import {
  getAllowedOrderTransitionsByRole,
  isOperatorUser,
  isValidOrderState,
} from "../../../../libs/OrderStateFlow";

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
    selfService: Boolean(order?.selfService),
    rmsOrderNumber: order?.rmsOrderNumber || "",
    createdAt: order?.createdAt || null,
    updatedAt: order?.updatedAt || null,
    closedAt: ["DONE", "REJECT"].includes(state) ? (order?.updatedAt || null) : null,
    date: order?.date || null,
    allowedTransitions: getAllowedOrderTransitionsByRole(state, operatorLimited),
  };
}

export default async function UpdateOrderKanbanStateController(req: any, res: any) {
  try {
    const { config } = req.adminizer || {};
    if (config?.auth?.enable && !req.user) {
      return res.redirect(`${config.routePrefix}/model/userap/login`);
    } else if (req.adminizer?.accessRightsHelper && !req.adminizer.accessRightsHelper.hasPermission(`order-kanban`, req.user)) {
      return res.sendStatus(403);
    }

    const { id, nextState } = req.body || {};
    if (!id || typeof id !== "string") {
      return res.status(400).json({ error: "Invalid order id" });
    }
    if (!isValidOrderState(nextState)) {
      return res.status(400).json({ error: "Invalid nextState" });
    }

    const order = await Order.findOne({ id });
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    const operatorLimited = isOperatorUser(req.user);

    if (order.state === nextState) {
      return res.json({ success: true, order: mapOrder(order, operatorLimited) });
    }

    const allowedTransitions = getAllowedOrderTransitionsByRole(order.state || "NEW", operatorLimited);
    if (!allowedTransitions.includes(nextState)) {
      return res.status(403).json({
        error: `Forbidden transition: ${order.state} -> ${nextState}`,
        allowedTransitions,
      });
    }

    if (operatorLimited) {
      await Order.update({ id }, { state: nextState }).fetch();
    } else {
      try {
        await Order.next({ id }, nextState);
      } catch (transitionError: any) {
        return res.status(400).json({ error: transitionError?.message || String(transitionError) });
      }
    }

    const updatedOrder = await Order.findOne({ id });
    if (!updatedOrder) {
      return res.status(404).json({ error: "Order not found after update" });
    }

    await Order.log({ id }, "info", "adminizer", "order-kanban: state changed", {
      from: order.state,
      to: nextState,
      byUserId: req.user?.id || null,
      operatorLimited,
    });

    return res.json({ success: true, order: mapOrder(updatedOrder, operatorLimited) });
  } catch (error) {
    sails.log.error("Update order kanban state error", error);
    return res.status(500).json({ error: String(error) });
  }
}
