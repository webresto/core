import { hasAccess } from "./marketing-helpers";
import { CODES_SCAN_LIMIT, promotionCodeStats } from "../../../marketing/applications";
import { promotionCodeStatus } from "../../../promotion-code";

const DEFAULT_RANGE_DAYS = 30;
const MAX_RANGE_DAYS = 365;

/**
 * GET …/core/marketing/promocodes/stats?days=30
 * Aggregates promo-code activity from the orders that carry a promotionCodeString within the range: totals, the
 * per-day trend, the top codes and an applied/invalid split. There is no dedicated redemption model, so this is
 * derived from Order — by `promotionCodeStats` of core (plan C20), which the mobile summary reads as well.
 */
export default async function GetPromoCodesStatsController(req: any, res: any) {
  try {
    if (!hasAccess(req, res, "promocodes-manager")) return;

    const requestedDays = Number.parseInt(String(req.query.days || String(DEFAULT_RANGE_DAYS)), 10);
    const days = Number.isFinite(requestedDays) ? Math.min(Math.max(requestedDays, 1), MAX_RANGE_DAYS) : DEFAULT_RANGE_DAYS;

    const stats = await promotionCodeStats({ days });

    // The inventory of codes is independent of the range of the orders.
    const allCodes = await PromotionCode.find!({} as any).limit(CODES_SCAN_LIMIT);
    const now = new Date();

    return res.json({
      range: stats.range,
      summary: {
        totalCodes: allCodes.length,
        activeCodes: allCodes.filter((code: any) => promotionCodeStatus(code, now) === "active").length,
        applications: stats.applications,
        appliedCount: stats.applied,
        invalidCount: stats.invalid,
        totalDiscount: stats.totalDiscount,
        avgDiscount: stats.avgDiscount,
        capped: stats.capped,
      },
      series: stats.series,
      topCodes: stats.topCodes,
      statuses: [
        { status: "applied", count: stats.applied },
        { status: "invalid", count: stats.invalid },
      ].filter((entry) => entry.count > 0),
    });
  } catch (error) {
    sails.log.error("Get promocodes stats error", error);
    return res.status(500).json({ error: String(error) });
  }
}
