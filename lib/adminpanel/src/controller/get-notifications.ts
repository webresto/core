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

function parseJsonArray(value: any): any[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string" && value.trim()) {
    try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; } catch {}
  }
  return [];
}

function parseStringList(value: any): string[] {
  const source = Array.isArray(value) ? value : String(value || "").split(",");
  return source
    .map((item: any) => String(item || "").trim())
    .filter(Boolean);
}

function parseNumberFilter(value: any): number | null {
  if (value === undefined || value === null || String(value).trim() === "") return null;
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function notificationChannelTypes(notification: any): Set<string> {
  const types = new Set<string>();
  for (const type of parseJsonArray(notification?.requestedChannels)) {
    const normalized = String(type || "").trim();
    if (normalized) types.add(normalized);
  }
  for (const channel of parseJsonArray(notification?.channels)) {
    const normalized = String(channel?.type || "").trim();
    if (normalized) types.add(normalized);
  }
  return types;
}

function mapNotification(notification: any): any {
  const logs = parseJsonArray(notification?.logs);
  return {
    id: notification?.id,
    title: notification?.title || "",
    body: notification?.body || "",
    status: notification?.status || "pending",
    groupTo: notification?.groupTo || "user",
    channels: parseJsonArray(notification?.channels),
    requestedChannels: parseJsonArray(notification?.requestedChannels),
    spentCost: notification?.spentCost ?? 0,
    deliveryAttempts: notification?.deliveryAttempts || 0,
    badge: notification?.badge || "info",
    readAt: notification?.readAt || null,
    deliveredAt: notification?.deliveredAt || null,
    createdAt: notification?.createdAt || null,
    updatedAt: notification?.updatedAt || null,
    data: notification?.data || null,
    user: formatUser(notification),
    recipient: resolveRecipient(notification),
    logsCount: logs.length,
    orderId: notification?.data && typeof notification.data === "object" ? notification.data.orderId || null : null,
  };
}

const PAGE_SIZE_DEFAULT = 50;
const PAGE_SIZE_MAX = 200;
// When q is present we load this many records to JS-filter, then slice
const Q_FETCH_LIMIT = 500;

// createdAt is stored as a Unix ms timestamp (number), so the filter must
// compare against millisecond values, not Date objects.
function parseDateFilter(value: string): { start: number; end: number } | null {
  const match = String(value || "").trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const start = new Date(year, month - 1, day, 0, 0, 0, 0);
  if (
    Number.isNaN(start.getTime())
    || start.getFullYear() !== year
    || start.getMonth() !== month - 1
    || start.getDate() !== day
  ) {
    return null;
  }
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start: start.getTime(), end: end.getTime() };
}

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
    const date = String(req.query.date || "").trim();
    const dateFilter = parseDateFilter(date);
    const channelTypes = parseStringList(req.query.channelTypes);
    const attemptsMin = parseNumberFilter(req.query.attemptsMin);
    const attemptsMax = parseNumberFilter(req.query.attemptsMax);

    // Build DB-level criteria — fields available without populate
    const dbCriteria: Record<string, any> = {};
    if (status) dbCriteria.status = status;
    if (groupTo) dbCriteria.groupTo = groupTo;
    if (userId) dbCriteria.user = userId;
    if (dateFilter) dbCriteria.createdAt = { ">=": dateFilter.start, "<": dateFilter.end };
    if (attemptsMin !== null || attemptsMax !== null) {
      dbCriteria.deliveryAttempts = {};
      if (attemptsMin !== null) dbCriteria.deliveryAttempts[">="] = attemptsMin;
      if (attemptsMax !== null) dbCriteria.deliveryAttempts["<="] = attemptsMax;
    }

    // orderId and channel type live in JSON fields — filter them in JS after DB fetch.
    const needsJsFilter = Boolean(q || orderId || channelTypes.length > 0);

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

      if (channelTypes.length > 0) {
        const notificationChannels = notificationChannelTypes(notification);
        if (!channelTypes.some((type) => notificationChannels.has(type))) return false;
      }

      if (!q) return true;

      const user = notification?.user && typeof notification.user === "object" ? notification.user : {};
      const phone = user?.phone && typeof user.phone === "object"
        ? `${user.phone.code || ""}${user.phone.number || ""}${user.phone.additionalNumber || ""}`
        : "";
      const recipient = resolveRecipient(notification);
      const channelHaystack = Array.from(notificationChannelTypes(notification)).join(" ");
      const haystack = [
        notification?.id,
        notification?.title,
        notification?.body,
        notification?.deliveryAttempts,
        user?.id,
        user?.name,
        user?.email,
        user?.login,
        phone,
        recipient?.name,
        recipient?.phone,
        notifOrderId,
        channelHaystack,
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
