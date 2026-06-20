import { hasAccess } from "./marketing-helpers";
import { mapPromotionFull } from "./get-marketing-promotions";

/**
 * GET …/core/marketing/promotion?id=
 * Single promotion (programmed or configured), with runtime adapter state.
 */
export default async function GetMarketingPromotionController(req: any, res: any) {
  const t = (key: string) => (req?.i18n?.__ ? req.i18n.__(key) : key);
  try {
    if (!hasAccess(req, res, "promotions-manager")) return;

    const id = String(req.query?.id || "").trim();
    if (!id) return res.status(400).json({ error: t("Promotion id is required") });

    const promotion = await Promotion.findOne({ id });
    if (!promotion) return res.status(404).json({ error: t("Promotion not found") });

    let activeIds: Set<string> | undefined;
    try { activeIds = new Set(Adapter.getPromotionAdapter().getActivePromotionsIds()); } catch { activeIds = undefined; }

    return res.json({ result: mapPromotionFull(promotion, activeIds) });
  } catch (error) {
    sails.log.error("Get marketing promotion error", error);
    return res.status(500).json({ error: String(error) });
  }
}
