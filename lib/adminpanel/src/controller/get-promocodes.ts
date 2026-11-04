import { hasAccess } from "./marketing-helpers";
import { listPromotionCodes, promotionCodeView } from "../../../marketing/promotion-codes";
import type { PromotionCodeStatus } from "../../../promotion-code";

const PAGE_SIZE_DEFAULT = 50;
const PAGE_SIZE_MAX = 200;

/** One code in the shape the module's front end reads. Core answers it (plan C18); this is the panel's name for it. */
export const mapPromotionCode = (code: any): any => promotionCodeView(code);

/**
 * GET …/core/marketing/promocodes
 * List/search/filter/paginate promotion codes (populated with their promotions).
 * Query: q, status (active|disabled|scheduled|expired), enable (true|false), type,
 * binding (with|without), skip, limit.
 */
export default async function GetPromoCodesController(req: any, res: any) {
  try {
    if (!hasAccess(req, res, "promocodes-manager")) return;

    const requestedLimit = Number.parseInt(String(req.query.limit || String(PAGE_SIZE_DEFAULT)), 10);
    const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), PAGE_SIZE_MAX) : PAGE_SIZE_DEFAULT;
    const requestedSkip = Number.parseInt(String(req.query.skip || "0"), 10);
    const skip = Number.isFinite(requestedSkip) && requestedSkip >= 0 ? requestedSkip : 0;

    const enable = String(req.query.enable || "").trim().toLowerCase();
    const binding = String(req.query.binding || "").trim().toLowerCase();
    const { items, capped } = await listPromotionCodes({
      q: String(req.query.q || ""),
      status: (String(req.query.status || "").trim().toLowerCase() || undefined) as PromotionCodeStatus | undefined,
      enable: enable === "true" ? true : enable === "false" ? false : undefined,
      type: String(req.query.type || "").trim().toLowerCase() || undefined,
      binding: binding === "with" || binding === "without" ? binding : undefined,
    });

    return res.json({
      results: items.slice(skip, skip + limit),
      meta: { total: items.length, skip, limit, capped },
    });
  } catch (error) {
    sails.log.error("Get promocodes error", error);
    return res.status(500).json({ error: String(error) });
  }
}
