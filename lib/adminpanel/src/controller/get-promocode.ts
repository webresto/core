import { hasAccess } from "./marketing-helpers";
import { mapPromotionCode } from "./get-promocodes";

/**
 * GET …/core/marketing/promocode?id=
 * Returns a single promotion code (populated with its promotions).
 * For deep links, the `id` query may contain either the record id or the human
 * promo-code value (e.g. SAVE25).
 */
export default async function GetPromoCodeController(req: any, res: any) {
  const t = (key: string) => (req?.i18n?.__ ? req.i18n.__(key) : key);
  try {
    if (!hasAccess(req, res, "promocodes-manager")) return;

    const rawId = String(req.query?.id || "").trim();
    if (!rawId) return res.status(400).json({ error: t("Promo code id is required") });

    const normalizedCode = rawId.toUpperCase();
    const code = await PromotionCode.findOne({
      or: [{ id: rawId }, { code: normalizedCode }],
    }).populate("promotion");
    if (!code) return res.status(404).json({ error: t("Promo code not found") });

    return res.json({ result: mapPromotionCode(code) });
  } catch (error) {
    sails.log.error("Get promocode error", error);
    return res.status(500).json({ error: String(error) });
  }
}
