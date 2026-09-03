import { getDefaultCookingPlaceId } from "../../../cooking-place";
import { getEffectiveBalances, readEffectiveBalance } from "../../../dish-place-balance";
import { hasAccess } from "./marketing-helpers";

/**
 * GET …/core/marketing/dishes?group=<id>  |  ?q=<search>  |  ?ids=<id,id,...>
 * Dishes for the promotion form's dish picker: by group, free-text search, or exact ids.
 * An empty query returns the first page so focusing the picker opens a useful dropdown.
 * Scoped to promotions-manager (thin wrapper — see §10.4).
 */
export default async function GetMarketingDishesController(req: any, res: any) {
  try {
    if (!hasAccess(req, res, "promotions-manager")) return;

    const group = String(req.query.group || "").trim();
    const q = String(req.query.q || "").trim();
    const ids = String(req.query.ids || "").split(",").map((id) => id.trim()).filter(Boolean).slice(0, 100);

    const where: any = ids.length ? { id: ids } : { isDeleted: false };
    if (ids.length) {
      // Exact lookup also resolves legacy/deleted dishes already referenced by a promotion.
    } else if (group) {
      where.parentGroup = group;
    } else if (q) {
      where.or = [{ name: { contains: q } }, { code: { contains: q } }];
    }

    const dishes = await Dish.find({ where, limit: 100 }).sort("name ASC");
    // Stock lives per cooking point; the picker shows it for the default one.
    const balances = await getEffectiveBalances(
      dishes.map((d: any) => String(d.id)),
      await getDefaultCookingPlaceId(),
    );
    const results = dishes.map((d: any) => ({
      id: d.id,
      name: d.name || d.id,
      code: d.code || "",
      parentGroup: d.parentGroup || null,
      isDeleted: Boolean(d.isDeleted),
      enable: d.enable !== false,
      visible: d.visible !== false,
      notForSale: Boolean(d.notForSale),
      balance: readEffectiveBalance(balances, d.id),
    }));

    return res.json({ results });
  } catch (error) {
    sails.log.error("Get marketing dishes error", error);
    return res.status(500).json({ error: String(error) });
  }
}
