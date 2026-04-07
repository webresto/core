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

function mapNotification(notification: any): any {
  return {
    id: notification?.id,
    title: notification?.title || "",
    body: notification?.body || "",
    status: notification?.status || "pending",
    groupTo: notification?.groupTo || "user",
    channels: Array.isArray(notification?.channels) ? notification.channels : [],
    badge: notification?.badge || "info",
    readAt: notification?.readAt || null,
    createdAt: notification?.createdAt || null,
    updatedAt: notification?.updatedAt || null,
    data: notification?.data || null,
    user: formatUser(notification),
    logsCount: Array.isArray(notification?.logs) ? notification.logs.length : 0,
    orderId: notification?.data && typeof notification.data === "object" ? notification.data.orderId || null : null,
  };
}

export default async function GetNotificationsController(req: any, res: any) {
  try {
    if (!hasAccess(req, res)) return;

    const requestedLimit = Number.parseInt(String(req.query.limit || "100"), 10);
    const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 200) : 100;
    const q = String(req.query.q || "").trim().toLowerCase();
    const status = String(req.query.status || "").trim().toLowerCase();
    const groupTo = String(req.query.groupTo || "").trim().toLowerCase();

    const notifications = await NotificationModel.find({})
      .populate("user")
      .sort("createdAt DESC")
      .limit(limit);

    const filtered = notifications.filter((notification: any) => {
      if (status && String(notification?.status || "").toLowerCase() !== status) return false;
      if (groupTo && String(notification?.groupTo || "").toLowerCase() !== groupTo) return false;

      if (!q) return true;

      const user = notification?.user && typeof notification.user === "object" ? notification.user : {};
      const phone = user?.phone && typeof user.phone === "object"
        ? `${user.phone.code || ""}${user.phone.number || ""}${user.phone.additionalNumber || ""}`
        : "";
      const orderId = notification?.data && typeof notification.data === "object" ? notification.data.orderId || "" : "";
      const haystack = [
        notification?.id,
        notification?.title,
        notification?.body,
        notification?.status,
        notification?.groupTo,
        notification?.badge,
        user?.id,
        user?.name,
        user?.email,
        phone,
        orderId,
      ].map((item) => String(item || "").toLowerCase()).join(" ");

      return haystack.includes(q);
    });

    return res.json({
      results: filtered.map(mapNotification),
      meta: {
        limit,
        total: filtered.length,
      },
    });
  } catch (error) {
    sails.log.error("Get notifications error", error);
    return res.status(500).json({ error: String(error) });
  }
}
