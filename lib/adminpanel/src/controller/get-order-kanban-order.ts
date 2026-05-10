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
    .populate("deliveryItem")
    .populate("promotionCode");

  if (!fullOrder) return null;

  const orderDishes = await OrderDish.find({ order: fullOrder.id }).populate("dish").sort("createdAt");
  fullOrder.dishes = Array.isArray(orderDishes) ? orderDishes : [];

  try {
    const paymentDocuments = await PaymentDocument.find({
      originModel: "order",
      originModelId: fullOrder.id,
    }).populate("paymentMethod").sort("createdAt");
    (fullOrder as any).paymentDocuments = Array.isArray(paymentDocuments) ? paymentDocuments : [];
  } catch (e) {
    sails.log.warn("get-order-kanban-order: failed to load PaymentDocuments", e);
    (fullOrder as any).paymentDocuments = [];
  }

  return fullOrder;
}

function mapRelatedRef(record: any, modelName: string, labelFields: string[] = ["title", "name"]): any {
  if (!record || typeof record !== "object") return null;
  const id = record.id;
  if (!id) return null;
  let label = "";
  for (const f of labelFields) {
    if (record[f]) { label = String(record[f]); break; }
  }
  if (!label) label = String(id);
  return { id, label, model: modelName };
}

function mapPaymentDocuments(order: any): any[] {
  const list = Array.isArray((order as any)?.paymentDocuments) ? (order as any).paymentDocuments : [];
  return list.map((pd: any) => {
    const pm = pd?.paymentMethod && typeof pd.paymentMethod === "object" ? pd.paymentMethod : null;
    return {
      id: pd?.id,
      status: pd?.status || "",
      amount: asNumber(pd?.amount),
      paid: Boolean(pd?.paid),
      externalId: pd?.externalId || "",
      comment: pd?.comment || "",
      error: pd?.error || "",
      redirectLink: pd?.redirectLink || "",
      createdAt: pd?.createdAt || null,
      updatedAt: pd?.updatedAt || null,
      paymentMethodTitle: pm?.title || "",
      paymentMethodId: pm?.id || (typeof pd?.paymentMethod === "string" ? pd.paymentMethod : ""),
      data: pd?.data || null,
    };
  });
}

function mapOrder(order: any, operatorLimited: boolean) {
  const customer = order?.customer && typeof order.customer === "object" ? order.customer : {};
  const paymentMethod = order?.paymentMethod && typeof order.paymentMethod === "object" ? order.paymentMethod : null;
  const userRecord = order?.user && typeof order.user === "object" ? order.user : null;
  const pickupPoint = order?.pickupPoint && typeof order.pickupPoint === "object" ? order.pickupPoint : null;
  const deliveryItem = order?.deliveryItem && typeof order.deliveryItem === "object" ? order.deliveryItem : null;
  const promotionCode = order?.promotionCode && typeof order.promotionCode === "object" ? order.promotionCode : null;

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
    relatedRefs: {
      user: mapRelatedRef(userRecord, "user", ["login", "name", "phone"]),
      paymentMethod: mapRelatedRef(paymentMethod, "paymentmethod", ["title", "name"]),
      pickupPoint: mapRelatedRef(pickupPoint, "place", ["title", "name"]),
      deliveryItem: mapRelatedRef(deliveryItem, "dish", ["title", "name"]),
      promotionCode: mapRelatedRef(promotionCode, "promotioncode", ["title", "code", "name"]),
    },
    paymentDocuments: mapPaymentDocuments(order),
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
