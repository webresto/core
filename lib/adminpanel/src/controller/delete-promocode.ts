import { hasAccess } from "./marketing-helpers";

/**
 * POST …/core/marketing/promocode-delete   { id }
 * Permanently removes a promotion code.
 */
export default async function DeletePromoCodeController(req: any, res: any) {
  const t = (key: string) => (req?.i18n?.__ ? req.i18n.__(key) : key);
  try {
    if (!hasAccess(req, res, "promocodes-manager")) return;

    const id = String(req.body?.id || "").trim();
    if (!id) return res.status(400).json({ error: t("Promo code id is required") });

    const found = await PromotionCode.findOne({ id });
    if (!found) return res.status(404).json({ success: false, error: t("Promo code not found") });

    // Drop the many-to-many links first, then destroy the record.
    await PromotionCode.replaceCollection(id, "promotion").members([]);
    await PromotionCode.destroy({ id }).fetch();

    return res.json({ success: true });
  } catch (error) {
    sails.log.error("Delete promocode error", error);
    return res.status(500).json({ error: String(error) });
  }
}
