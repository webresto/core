import { hasAccess, toNumber, parseJsonArray, parseJsonObject } from "./marketing-helpers";

const PAGE_SIZE_DEFAULT = 50;
const PAGE_SIZE_MAX = 200;
// When a free-text query / specific code is present we load a batch and JS-filter, then slice.
const Q_FETCH_LIMIT = 2000;

function orderDiscount(order: any): number {
  const total = toNumber(order?.discountTotal);
  if (total > 0) return total;
  return toNumber(order?.promotionFlatDiscount);
}

function mapActivity(order: any): any {
  const applied = order?.promotionCode !== null && order?.promotionCode !== undefined;
  return {
    orderId: order?.id,
    shortId: order?.shortId || "",
    state: order?.state || "",
    code: order?.promotionCodeString || "",
    description: order?.promotionCodeDescription || "",
    discount: applied ? orderDiscount(order) : 0,
    status: applied ? "applied" : "invalid",
    createdAt: order?.createdAt || null,
    promotionState: parseJsonArray(order?.promotionState),
    promotionErrors: order?.promotionErrors ? (parseJsonArray(order.promotionErrors).length ? parseJsonArray(order.promotionErrors) : parseJsonObject(order.promotionErrors)) : null,
  };
}

function parseDateMs(value: string): number | null {
  const match = String(value || "").trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const d = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 0, 0, 0, 0);
  return Number.isNaN(d.getTime()) ? null : d.getTime();
}

/**
 * GET …/core/marketing/promocodes/activity
 * Feed of promo-code applications, derived from orders carrying a promotionCodeString.
 * Query: q (code/order short id), code (exact), status (applied|invalid), from, to, skip, limit.
 */
export default async function GetPromoCodesActivityController(req: any, res: any) {
  try {
    if (!hasAccess(req, res, "promocodes-manager")) return;

    const requestedLimit = Number.parseInt(String(req.query.limit || String(PAGE_SIZE_DEFAULT)), 10);
    const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), PAGE_SIZE_MAX) : PAGE_SIZE_DEFAULT;
    const requestedSkip = Number.parseInt(String(req.query.skip || "0"), 10);
    const skip = Number.isFinite(requestedSkip) && requestedSkip >= 0 ? requestedSkip : 0;

    const q = String(req.query.q || "").trim().toLowerCase();
    const code = String(req.query.code || "").trim();
    const status = String(req.query.status || "").trim().toLowerCase();
    const fromMs = parseDateMs(String(req.query.from || ""));
    const toMs = parseDateMs(String(req.query.to || ""));

    const where: Record<string, any> = { promotionCodeString: { "!=": null } };
    if (code) where.promotionCodeString = code;
    if (fromMs || toMs) {
      const range: Record<string, number> = {};
      if (fromMs) range[">="] = fromMs;
      if (toMs) range["<"] = toMs + 24 * 60 * 60 * 1000;
      where.createdAt = range as any;
    }

    const needsJsFilter = Boolean(q || status);

    if (!needsJsFilter) {
      const [total, orders] = await Promise.all([
        Order.count(where),
        Order.find({ where }).sort("createdAt DESC").skip(skip).limit(limit),
      ]);
      return res.json({ results: orders.map(mapActivity), meta: { total, skip, limit } });
    }

    const orders = await Order.find({ where }).sort("createdAt DESC").limit(Q_FETCH_LIMIT);
    const mapped = orders.map(mapActivity);
    const filtered = mapped.filter((row: any) => {
      if (status && row.status !== status) return false;
      if (!q) return true;
      const haystack = [row.code, row.shortId, row.description].map((x) => String(x || "").toLowerCase()).join(" ");
      return haystack.includes(q);
    });

    const total = filtered.length;
    const page = filtered.slice(skip, skip + limit);
    return res.json({ results: page, meta: { total, skip, limit, capped: orders.length >= Q_FETCH_LIMIT } });
  } catch (error) {
    sails.log.error("Get promocodes activity error", error);
    return res.status(500).json({ error: String(error) });
  }
}
