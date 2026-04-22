import {
  getAllowedOrderTransitionsByRole,
  isCompletedOrderState,
  isOperatorUser,
} from "../../../../libs/OrderStateFlow";

function parseTimestamp(value: unknown): number {
  const timestamp = new Date(value as any).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function getCompletedOrderTimestampMs(order: any): number {
  const directTimestamp = Math.max(
    parseTimestamp(order?.closedAt),
    parseTimestamp(order?.completedAt),
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

  if (completedTimestamp > 0) return completedTimestamp;
  return parseTimestamp(order?.updatedAt);
}

function resolveClosedAt(order: any): string | null {
  if (!isCompletedOrderState(order?.state)) return null;
  const timestamp = getCompletedOrderTimestampMs(order);
  return timestamp > 0 ? new Date(timestamp).toISOString() : null;
}

function asNumber(value: unknown, fallback = 0): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function getCustomerPhone(order: any): string {
  const customer = order?.customer && typeof order.customer === "object" ? order.customer : {};
  if (customer?.phone && typeof customer.phone === "object") {
    return `${customer.phone.code || ""}${customer.phone.number || ""}${customer.phone.additionalNumber || ""}`;
  }
  return "";
}

function mapItems(order: any): any[] {
  if (!Array.isArray(order?.dishes)) return [];

  return order.dishes.map((item: any) => {
    const dish = item?.dish && typeof item.dish === "object" ? item.dish : {};
    const modifiers = Array.isArray(item?.modifiers)
      ? item.modifiers.map((modifier: any) => {
        const modifierDish = modifier?.dish && typeof modifier.dish === "object" ? modifier.dish : {};
        return {
          id: modifier?.id || modifier?.rmsId || "",
          name: modifierDish?.title || modifierDish?.name || modifier?.name || modifier?.rmsId || modifier?.id || "-",
          amount: asNumber(modifier?.amount, 1),
          price: asNumber(modifier?.price ?? modifier?.itemPrice ?? modifier?.cost),
          total: asNumber(modifier?.total ?? modifier?.itemTotal),
          groupId: modifier?.groupId || "",
        };
      })
      : [];

    return {
      id: item?.id,
      name: dish?.title || dish?.name || dish?.id || "-",
      amount: asNumber(item?.amount, 1),
      comment: item?.comment || "",
      addedBy: item?.addedBy || "",
      itemTotal: asNumber(item?.itemTotal),
      itemTotalBeforeDiscount: asNumber(item?.itemTotalBeforeDiscount),
      itemPrice: asNumber(item?.itemPrice),
      discountTotal: asNumber(item?.discountTotal),
      discountType: item?.discountType || "",
      discountAmount: asNumber(item?.discountAmount),
      discountMessage: item?.discountMessage || "",
      weight: asNumber(item?.weight),
      totalWeight: asNumber(item?.totalWeight),
      modifiers,
    };
  });
}

async function loadFullOrder(id: string): Promise<any | null> {
  const fullOrder = await Order.findOne({ id })
    .populate("paymentMethod")
    .populate("user")
    .populate("pickupPoint")
    .populate("deliveryItem");

  if (!fullOrder) return null;

  const orderDishes = await OrderDish.find({ order: fullOrder.id }).populate("dish").sort("createdAt");
  fullOrder.dishes = Array.isArray(orderDishes) ? orderDishes : [];
  return fullOrder;
}

function mapOrder(order: any, operatorLimited: boolean) {
  const customer = order?.customer && typeof order.customer === "object" ? order.customer : {};
  const paymentMethod = order?.paymentMethod && typeof order.paymentMethod === "object" ? order.paymentMethod : null;

  return {
    id: order?.id,
    shortId: order?.shortId || String(order?.id || "").slice(-8),
    state: order?.state || "NEW",
    total: asNumber(order?.total),
    basketTotal: asNumber(order?.basketTotal),
    discountTotal: asNumber(order?.discountTotal),
    bonusesTotal: asNumber(order?.bonusesTotal),
    promotionFlatDiscount: asNumber(order?.promotionFlatDiscount),
    deliveryCost: asNumber(order?.deliveryCost ?? order?.delivery?.cost),
    dishesCount: asNumber(order?.dishesCount, Array.isArray(order?.dishes) ? order.dishes.length : 0),
    customerName: customer?.name || "",
    customerPhone: getCustomerPhone(order),
    comment: order?.comment || "",
    tag: order?.tag || "",
    paid: Boolean(order?.paid),
    selfService: Boolean(order?.selfService),
    rmsOrderNumber: order?.rmsOrderNumber || "",
    createdAt: order?.createdAt || null,
    updatedAt: order?.updatedAt || null,
    closedAt: resolveClosedAt(order),
    date: order?.date || null,
    paymentMethodTitle: paymentMethod?.title || order?.paymentMethodTitle || "",
    promotionCodeString: order?.promotionCodeString || "",
    promotionCodeDescription: order?.promotionCodeDescription || "",
    promotionState: Array.isArray(order?.promotionState) ? order.promotionState : [],
    promotionErrors: Array.isArray(order?.promotionErrors) ? order.promotionErrors : (order?.promotionErrors || []),
    promotionUnorderable: Boolean(order?.promotionUnorderable),
    promotionDelivery: order?.promotionDelivery || null,
    spendBonus: order?.spendBonus || null,
    customData: order?.customData || null,
    items: mapItems(order),
    allowedTransitions: getAllowedOrderTransitionsByRole(order?.state || "NEW", operatorLimited),
    rawPayload: order,
  };
}

export default async function GetOrderKanbanOrderController(req: any, res: any) {
  const t = (key: string) => req?.i18n?.__ ? req.i18n.__(key) : key;
  try {
    const { config } = req.adminizer || {};
    if (config?.auth?.enable && !req.user) {
      return res.redirect(`${config.routePrefix}/model/userap/login`);
    } else if (req.adminizer?.accessRightsHelper && !req.adminizer.accessRightsHelper.hasPermission(`order-kanban`, req.user)) {
      return res.sendStatus(403);
    }

    const id = String(req.query.id || "").trim();
    if (!id) {
      return res.status(400).json({ error: t("Invalid order id") });
    }

    const operatorLimited = isOperatorUser(req.user);
    const order = await loadFullOrder(id);

    if (!order?.id) {
      return res.status(404).json({ error: t("Order not found") });
    }

    return res.json({ order: mapOrder(order, operatorLimited) });
  } catch (error) {
    sails.log.error("Get order kanban order error", error);
    return res.status(500).json({ error: String(error) });
  }
}
