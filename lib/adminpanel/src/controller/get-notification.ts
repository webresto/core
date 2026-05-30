function hasAccess(req: any, res: any): boolean {
  const { config } = req.adminizer || {};
  if (config?.auth?.enable && !req.user) {
    res.redirect(`${config.routePrefix}/model/userap/login`);
    return false;
  }
  if (req.adminizer?.accessRightsHelper && !req.adminizer.accessRightsHelper.hasPermission("notifications-manager", req.user)) {
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

    return res.json({
      notification: {
        id: notification.id,
        title: notification.title || "",
        body: notification.body || "",
        status: notification.status || "pending",
        groupTo: notification.groupTo || "user",
        channels: Array.isArray(notification.channels) ? notification.channels : [],
        requestedChannels: Array.isArray(notification.requestedChannels) ? notification.requestedChannels : [],
        important: Boolean(notification.important),
        deliveryAttempts: notification.deliveryAttempts || 0,
        badge: notification.badge || "info",
        readAt: notification.readAt || null,
        createdAt: notification.createdAt || null,
        updatedAt: notification.updatedAt || null,
        data: notification.data || null,
        user: formatUser(notification),
        logs: Array.isArray(notification.logs) ? notification.logs : [],
        rawPayload: notification,
      }
    });
  } catch (error) {
    sails.log.error("Get notification error", error);
    return res.status(500).json({ error: String(error) });
  }
}
