const ORDER_STATES = new Set([
  "NEW",
  "CART",
  "CHECKOUT",
  "PAYMENT",
  "ORDER",
  "COOKING",
  "ON_THE_WAY",
  "DONE",
  "REJECT",
]);
const OPERATOR_ALLOWED_TARGET_STATES = new Set(["REJECT", "COOKING", "ON_THE_WAY", "DONE"]);

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
    return Array.from(OPERATOR_ALLOWED_TARGET_STATES).filter((targetState) => targetState !== normalizedState);
  }

  const transitions: Record<string, string[]> = {
    NEW: ["CART"],
    CART: ["CHECKOUT", "REJECT"],
    CHECKOUT: ["CART", "PAYMENT", "ORDER", "REJECT"],
    PAYMENT: ["CART", "ORDER", "CHECKOUT", "REJECT"],
    ORDER: ["COOKING", "ON_THE_WAY", "DONE", "REJECT"],
    COOKING: ["ON_THE_WAY", "DONE", "REJECT"],
    ON_THE_WAY: ["DONE", "REJECT"],
    DONE: [],
    REJECT: [],
  };

  return transitions[normalizedState] || [];
}

function mapOrder(order: any, operatorLimited: boolean) {
  const customer = order?.customer && typeof order.customer === "object" ? order.customer : {};
  const phone = customer?.phone && typeof customer.phone === "object"
    ? `${customer.phone.code || ""}${customer.phone.number || ""}`
    : "";

  const dishesCount = typeof order?.dishesCount === "number"
    ? order.dishesCount
    : Array.isArray(order?.dishes) ? order.dishes.length : 0;

  return {
    id: order?.id,
    shortId: order?.shortId || String(order?.id || "").slice(-8),
    state: order?.state || "NEW",
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
    allowedTransitions: getAllowedTransitions(order?.state || "NEW", operatorLimited),
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
    if (!nextState || !ORDER_STATES.has(nextState)) {
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

    if (operatorLimited) {
      if (!OPERATOR_ALLOWED_TARGET_STATES.has(nextState)) {
        return res.status(403).json({ error: "Operator can move orders only to reject, cooking, on_the_way or done" });
      }
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
