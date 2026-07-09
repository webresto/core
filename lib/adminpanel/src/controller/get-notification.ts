import { hasModulePermission, NOTIFICATIONS_ACCESS } from "./access-rights";

function hasAccess(req: any, res: any): boolean {
  const { config } = req.adminizer || {};
  if (config?.auth?.enable && !req.user) {
    res.redirect(`${config.routePrefix}/model/userap/login`);
    return false;
  }
  if (!hasModulePermission(req, NOTIFICATIONS_ACCESS, "view")) {
    res.sendStatus(403);
    return false;
  }
  return true;
}

const NotificationModel = (globalThis as any).Notification;

function formatUser(notification: any): { id: string; name: string; phone: string } | null {
  const user = notification?.user;
  if (!user || typeof user !== "object") return null;

  const phone = user?.phone && typeof user.phone === "object"
    ? `${user.phone.code || ""}${user.phone.number || ""}${user.phone.additionalNumber || ""}`
    : "";

  return {
    id: user.id,
    name: user.name || user.email || user.id || "",
    phone,
  };
}

// Resolve who the notification is actually for. Order.customer (carried in
// data.context.order.customer / data.recipient) is the real contact and wins over
// the linked account, so guest orders do not look like manager-originated messages.
function resolveRecipient(notification: any): { name: string; phone: string; source: "customer" | "account" | null } {
  const data = notification?.data && typeof notification.data === "object" ? notification.data : {};
  const customer =
    (data?.context?.order?.customer && typeof data.context.order.customer === "object" && data.context.order.customer)
    || (data?.customer && typeof data.customer === "object" && data.customer)
    || (data?.recipient && typeof data.recipient === "object" && data.recipient)
    || null;
  if (customer && (customer.name || customer.phone)) {
    return { name: String(customer.name || ""), phone: String(customer.phone || ""), source: "customer" };
  }
  const account = formatUser(notification);
  if (account) return { name: account.name, phone: account.phone, source: "account" };
  return { name: "", phone: "", source: null };
}

export default async function GetNotificationController(req: any, res: any) {
  const t = (key: string) => req?.i18n?.__ ? req.i18n.__(key) : key;
  try {
    if (!hasAccess(req, res)) return;

    const id = String(req.query.id || "").trim();
    if (!id) {
      return res.status(400).json({ error: t("Invalid notification id") });
    }

    const notification = await NotificationModel.findOne({ id }).populate("user");
    if (!notification) {
      return res.status(404).json({ error: t("Notification not found") });
    }

    const parseJsonArray = (value: any): any[] => {
      if (Array.isArray(value)) return value;
      if (typeof value === "string" && value.trim()) {
        try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; } catch {}
      }
      return [];
    };

    return res.json({
      notification: {
        id: notification.id,
        title: notification.title || "",
        body: notification.body || "",
        status: notification.status || "pending",
        groupTo: notification.groupTo || "user",
        channels: parseJsonArray(notification.channels),
        requestedChannels: parseJsonArray(notification.requestedChannels),
        spentCost: notification.spentCost ?? 0,
        important: Boolean(notification.important),
        deliveryAttempts: notification.deliveryAttempts || 0,
        badge: notification.badge || "info",
        readAt: notification.readAt || null,
        createdAt: notification.createdAt || null,
        updatedAt: notification.updatedAt || null,
        data: notification.data || null,
        user: formatUser(notification),
        recipient: resolveRecipient(notification),
        logs: parseJsonArray(notification.logs),
        rawPayload: notification,
      }
    });
  } catch (error) {
    sails.log.error("Get notification error", error);
    return res.status(500).json({ error: String(error) });
  }
}
