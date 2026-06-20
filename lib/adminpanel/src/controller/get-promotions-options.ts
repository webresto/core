import { hasAccess, mapPromotionOption } from "./marketing-helpers";

/**
 * GET …/core/marketing/promotions-options
 * Lightweight list of promotions for linking to a promo code (id + name + discount summary
 * + badge / configured-vs-programmed flag). Used by the promo-code editor's MultiSelect.
 * Accessible to promo-code managers (it only exposes a read-only summary).
 */
export default async function GetPromotionsOptionsController(req: any, res: any) {
  try {
    if (!hasAccess(req, res, "promocodes-manager")) return;

    const promotions = await Promotion.find({ where: { isDeleted: false } }).sort("sortOrder ASC");
    const results = promotions.map(mapPromotionOption);

    return res.json({ results });
  } catch (error) {
    sails.log.error("Get promotions options error", error);
    return res.status(500).json({ error: String(error) });
  }
}
