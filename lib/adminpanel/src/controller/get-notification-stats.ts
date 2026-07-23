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

// How many days of history the dashboard aggregates by default.
const DEFAULT_RANGE_DAYS = 30;
const MAX_RANGE_DAYS = 365;
// Safety cap on records scanned for aggregation in a single request.
const SCAN_LIMIT = 20000;

function parseJsonArray(value: any): any[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string" && value.trim()) {
    try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; } catch {}
  }
  return [];
}

function toNumber(value: any): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

// Local YYYY-MM-DD bucket key for a Unix ms timestamp.
function dayKey(ms: number): string {
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Aggregated stats for the notifications dashboard:
 *  - per-channel notification counts + accumulated cost (for the channels chart);
 *  - a daily time-series of counts, failed counts, and cost (for the trend chart);
 *  - status totals and overall summary (total notifications, total spent cost).
 *
 * `channels` on a Notification is a JSON array of actually-sent entries
 * ({ type, cost, sentAt }); one notification may have several channel entries
 * (waterfall / escalation), so per-channel counts can exceed the notification total.
 */
export default async function GetNotificationStatsController(req: any, res: any) {
  try {
    if (!hasAccess(req, res)) return;

    const requestedDays = Number.parseInt(String(req.query.days || String(DEFAULT_RANGE_DAYS)), 10);
    const days = Number.isFinite(requestedDays)
      ? Math.min(Math.max(requestedDays, 1), MAX_RANGE_DAYS)
      : DEFAULT_RANGE_DAYS;

    // Range start: midnight `days - 1` days ago, so the series spans `days` calendar days
    // up to and including today.
    const rangeStartDate = new Date();
    rangeStartDate.setHours(0, 0, 0, 0);
    rangeStartDate.setDate(rangeStartDate.getDate() - (days - 1));
    const rangeStart = rangeStartDate.getTime();

    // NB: no custom `select` clause here — the Notification model is `schema: false`,
    // and Waterline rejects field projection on schemaless models.
    const notifications = await NotificationModel.find({
      where: { createdAt: { ">=": rangeStart } },
    })
      .sort("createdAt ASC")
      .limit(SCAN_LIMIT);

    // Per-channel aggregation
    const channelMap: Record<string, { type: string; count: number; cost: number; sentCount: number }> = {};
    // Status totals
    const statusMap: Record<string, number> = {};
    // Daily time-series buckets, keyed YYYY-MM-DD. `channelCounts`/`channelCosts` hold the
    // per-channel breakdown for that day, used to draw the stacked-by-channel trend charts.
    const dayMap: Record<string, {
      date: string;
      count: number;
      failedCount: number;
      cost: number;
      channelCounts: Record<string, number>;
      channelCosts: Record<string, number>;
    }> = {};

    // Pre-seed every day in the range so the trend chart has no gaps.
    for (let i = 0; i < days; i += 1) {
      const d = new Date(rangeStart);
      d.setDate(d.getDate() + i);
      const key = dayKey(d.getTime());
      if (key) dayMap[key] = { date: key, count: 0, failedCount: 0, cost: 0, channelCounts: {}, channelCosts: {} };
    }

    let totalNotifications = 0;
    let totalCost = 0;

    for (const notification of notifications) {
      totalNotifications += 1;

      const status = String(notification?.status || "pending").toLowerCase();
      statusMap[status] = (statusMap[status] || 0) + 1;

      const spentCost = toNumber(notification?.spentCost);
      totalCost += spentCost;

      const createdAt = toNumber(notification?.createdAt);
      const key = createdAt ? dayKey(createdAt) : "";
      if (key && dayMap[key]) {
        dayMap[key].count += 1;
        if (status === "failed") dayMap[key].failedCount += 1;
        dayMap[key].cost += spentCost;
      }

      const channels = parseJsonArray(notification?.channels);
      const dayBucket = key ? dayMap[key] : null;
      for (const entry of channels) {
        const type = String(entry?.type || "").trim();
        if (!type) continue;
        const entryCost = toNumber(entry?.cost);
        if (!channelMap[type]) channelMap[type] = { type, count: 0, cost: 0, sentCount: 0 };
        // count: notifications that used this channel (one ++ per channel entry);
        // sentCount: entries that actually carry a sentAt timestamp (delivered attempts).
        channelMap[type].count += 1;
        channelMap[type].cost += entryCost;
        if (entry?.sentAt) channelMap[type].sentCount += 1;
        // Per-day per-channel breakdown for the stacked trend charts.
        if (dayBucket) {
          dayBucket.channelCounts[type] = (dayBucket.channelCounts[type] || 0) + 1;
          dayBucket.channelCosts[type] = (dayBucket.channelCosts[type] || 0) + entryCost;
        }
      }
    }

    const channels = Object.values(channelMap).sort((a, b) => b.count - a.count);
    const series = Object.values(dayMap).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    const statuses = Object.entries(statusMap)
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);

    return res.json({
      range: { days, start: rangeStart },
      summary: {
        totalNotifications,
        totalCost,
        // Average cost per notification (0 when nothing in range).
        avgCost: totalNotifications > 0 ? totalCost / totalNotifications : 0,
        capped: notifications.length >= SCAN_LIMIT,
      },
      channels,
      statuses,
      series,
    });
  } catch (error) {
    sails.log.error("Get notification stats error", error);
    return res.status(500).json({ error: String(error) });
  }
}
