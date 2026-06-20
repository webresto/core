import { hasAccess, toNumber, dayKey, promotionCodeStatus } from "./marketing-helpers";

const DEFAULT_RANGE_DAYS = 30;
const MAX_RANGE_DAYS = 365;
// Safety cap on records scanned per request (mirrors get-notification-stats).
const SCAN_LIMIT = 20000;
const CODES_SCAN_LIMIT = 5000;
const TOP_CODES = 8;

function orderDiscount(order: any): number {
  const total = toNumber(order?.discountTotal);
  if (total > 0) return total;
  return toNumber(order?.promotionFlatDiscount);
}

/**
 * GET …/core/marketing/promocodes/stats?days=30
 * Aggregates promo-code activity from orders that carry a promotionCodeString within the
 * range: totals, per-day trend, top codes, and an applied/invalid status split. There is no
 * dedicated redemption model, so this is derived from Order (see §0.5 of the UI/UX spec).
 */
export default async function GetPromoCodesStatsController(req: any, res: any) {
  try {
    if (!hasAccess(req, res, "promocodes-manager")) return;

    const requestedDays = Number.parseInt(String(req.query.days || String(DEFAULT_RANGE_DAYS)), 10);
    const days = Number.isFinite(requestedDays) ? Math.min(Math.max(requestedDays, 1), MAX_RANGE_DAYS) : DEFAULT_RANGE_DAYS;

    const rangeStartDate = new Date();
    rangeStartDate.setHours(0, 0, 0, 0);
    rangeStartDate.setDate(rangeStartDate.getDate() - (days - 1));
    const rangeStart = rangeStartDate.getTime();

    const orders = await Order.find({
      where: {
        promotionCodeString: { "!=": null },
        // createdAt is stored as epoch-ms (number) at runtime; cast the comparator.
        createdAt: { ">=": rangeStart } as any,
      },
    })
      .sort("createdAt ASC")
      .limit(SCAN_LIMIT);

    // Per-day buckets, pre-seeded so the trend chart has no gaps.
    const dayMap: Record<string, { date: string; applications: number; discount: number }> = {};
    for (let i = 0; i < days; i += 1) {
      const d = new Date(rangeStart);
      d.setDate(d.getDate() + i);
      const key = dayKey(d.getTime());
      if (key) dayMap[key] = { date: key, applications: 0, discount: 0 };
    }

    const codeMap: Record<string, { code: string; applications: number; discount: number }> = {};
    let applications = 0;
    let appliedCount = 0;
    let invalidCount = 0;
    let totalDiscount = 0;

    for (const order of orders) {
      applications += 1;
      const applied = order?.promotionCode !== null && order?.promotionCode !== undefined;
      if (applied) appliedCount += 1; else invalidCount += 1;

      const discount = applied ? orderDiscount(order) : 0;
      totalDiscount += discount;

      const createdAt = toNumber(order?.createdAt);
      const key = createdAt ? dayKey(createdAt) : "";
      if (key && dayMap[key]) {
        dayMap[key].applications += 1;
        dayMap[key].discount += discount;
      }

      const codeStr = String(order?.promotionCodeString || "").trim();
      if (codeStr) {
        if (!codeMap[codeStr]) codeMap[codeStr] = { code: codeStr, applications: 0, discount: 0 };
        codeMap[codeStr].applications += 1;
        codeMap[codeStr].discount += discount;
      }
    }

    // Code inventory totals (independent of the order range).
    const allCodes = await PromotionCode.find({}).limit(CODES_SCAN_LIMIT);
    const totalCodes = allCodes.length;
    const now = new Date();
    const activeCodes = allCodes.filter((c: any) => promotionCodeStatus(c, now) === "active").length;

    const series = Object.values(dayMap).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    const topCodes = Object.values(codeMap)
      .sort((a, b) => b.applications - a.applications || b.discount - a.discount)
      .slice(0, TOP_CODES);
    const statuses = [
      { status: "applied", count: appliedCount },
      { status: "invalid", count: invalidCount },
    ].filter((s) => s.count > 0);

    return res.json({
      range: { days, start: rangeStart },
      summary: {
        totalCodes,
        activeCodes,
        applications,
        appliedCount,
        invalidCount,
        totalDiscount,
        avgDiscount: applications > 0 ? totalDiscount / applications : 0,
        capped: orders.length >= SCAN_LIMIT,
      },
      series,
      topCodes,
      statuses,
    });
  } catch (error) {
    sails.log.error("Get promocodes stats error", error);
    return res.status(500).json({ error: String(error) });
  }
}
