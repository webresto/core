import { hasAccess } from "./marketing-helpers";
import { activePromotionIds, listPromotions, promotionView } from "../../../marketing/promotions";

const CONFIGURED_BADGE = "configured-promotion";

/** One promotion in the shape the module's front end reads; core answers it (plan C18). */
export function mapPromotionFull(promotion: any, activeIds?: Set<string>): any {
  return promotionView(promotion, { activeIds });
}

export { activePromotionIds };

/**
 * GET …/core/marketing/promotions
 * Lists promotions (programmed + configured), enriched with runtime adapter state.
 * Query: q, kind (programmed|configured), enable (on|off), onlyByCode (true), concept.
 */
export default async function GetMarketingPromotionsController(req: any, res: any) {
  try {
    if (!hasAccess(req, res, "promotions-manager")) return;

    const kind = String(req.query.kind || "").trim().toLowerCase();
    const enable = String(req.query.enable || "").trim().toLowerCase();
    const onlyByCode = String(req.query.onlyByCode || "").trim().toLowerCase();
    const results = await listPromotions({
      q: String(req.query.q || ""),
      kind: kind === "configured" || kind === "programmed" ? kind : undefined,
      // `enable=on` is "works at all", as it always was; "applies by itself" is `onlyByCode=false` since C22.
      applies: onlyByCode === "true" ? "code-only" : enable === "on" ? undefined : enable === "off" ? "off" : undefined,
      concept: String(req.query.concept || "").trim() || undefined,
    });
    const shown = enable === "on" ? results.filter((promotion) => promotion.enable) : results;

    return res.json({
      results: shown,
      meta: { total: shown.length, configuredBadge: CONFIGURED_BADGE },
    });
  } catch (error) {
    sails.log.error("Get marketing promotions error", error);
    return res.status(500).json({ error: String(error) });
  }
}
