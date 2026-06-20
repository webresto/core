import { hasAccess } from "./marketing-helpers";

/**
 * POST …/core/marketing/promotion-delete   { id }
 * Soft-deletes a configured promotion (isDeleted: true + enable: false). The enable:false
 * makes afterUpdate drop the live ConfiguredPromotion handler from the adapter. Programmed
 * promotions are managed in code and cannot be deleted here (§8.0).
 */
export default async function DeleteMarketingPromotionController(req: any, res: any) {
  const t = (key: string) => (req?.i18n?.__ ? req.i18n.__(key) : key);
  try {
    if (!hasAccess(req, res, "promotions-manager")) return;

    const id = String(req.body?.id || "").trim();
    if (!id) return res.status(400).json({ error: t("Promotion id is required") });

    const promotion = await Promotion.findOne({ id });
    if (!promotion) return res.status(404).json({ success: false, error: t("Promotion not found") });
    if (!promotion.createdByUser) {
      return res.status(403).json({ success: false, error: t("Programmed promotions cannot be deleted") });
    }

    await Promotion.update({ id }, { isDeleted: true, enable: false }).fetch();
    return res.json({ success: true });
  } catch (error) {
    sails.log.error("Delete marketing promotion error", error);
    return res.status(500).json({ error: String(error) });
  }
}
