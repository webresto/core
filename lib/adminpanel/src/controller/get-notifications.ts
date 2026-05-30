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

const PAGE_SIZE_DEFAULT = 50;
const PAGE_SIZE_MAX = 200;
// When q is present we load this many records to JS-filter, then slice
const Q_FETCH_LIMIT = 500;

export default async function GetNotificationsController(req: any, res: any) {
  try {
    if (!hasAccess(req, res)) return;

    const requestedLimit = Number.parseInt(String(req.query.limit || String(PAGE_SIZE_DEFAULT)), 10);
    const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), PAGE_SIZE_MAX) : PAGE_SIZE_DEFAULT;

    const requestedSkip = Number.parseInt(String(req.query.skip || "0"), 10);
    const skip = Number.isFinite(requestedSkip) && requestedSkip >= 0 ? requestedSkip : 0;

    const q = String(req.query.q || "").trim().toLowerCase();
    const status = String(req.query.status || "").trim().toLowerCase();
    const groupTo = String(req.query.groupTo || "").trim().toLowerCase();
    const userId = String(req.query.userId || "").trim();
    const orderId = String(req.query.orderId || "").trim();

    // Build DB-level criteria — fields available without populate
    const dbCriteria: Record<string, any> = {};
    if (status) dbCriteria.status = status;
    if (groupTo) dbCriteria.groupTo = groupTo;
    if (userId) dbCriteria.user = userId;

    // orderId is stored in the JSON `data` field — requires JS filtering after DB fetch
    const needsJsFilter = Boolean(q || orderId);

    if (!needsJsFilter) {
      // Efficient path: DB count + paginated fetch
      const [total, notifications] = await Promise.all([
        NotificationModel.count(dbCriteria),
        NotificationModel.find(dbCriteria)
          .populate("user")
          .sort("createdAt DESC")
          .skip(skip)
          .limit(limit),
      ]);

      return res.json({
        results: notifications.map(mapNotification),
        meta: { total, skip, limit },
      });
    }

    // JS-filter path: load a larger batch, apply filters, then paginate
    const notifications = await NotificationModel.find(dbCriteria)
      .populate("user")
      .sort("createdAt DESC")
      .limit(Q_FETCH_LIMIT);

    const filtered = notifications.filter((notification: any) => {
      const notifOrderId = notification?.data && typeof notification.data === "object"
        ? String(notification.data.orderId || "")
        : "";

      // Exact orderId filter
      if (orderId && notifOrderId !== orderId) return false;

      if (!q) return true;

      const user = notification?.user && typeof notification.user === "object" ? notification.user : {};
      const phone = user?.phone && typeof user.phone === "object"
        ? `${user.phone.code || ""}${user.phone.number || ""}${user.phone.additionalNumber || ""}`
        : "";
      const haystack = [
        notification?.id,
        notification?.title,
        notification?.body,
        user?.id,
        user?.name,
        user?.email,
        user?.login,
        phone,
        notifOrderId,
      ].map((item) => String(item || "").toLowerCase()).join(" ");

      return haystack.includes(q);
    });

    const total = filtered.length;
    const page = filtered.slice(skip, skip + limit);

    return res.json({
      results: page.map(mapNotification),
      meta: { total, skip, limit, capped: notifications.length >= Q_FETCH_LIMIT },
    });
  } catch (error) {
    sails.log.error("Get notifications error", error);
    return res.status(500).json({ error: String(error) });
  }
}
