import { hasAccess } from "./marketing-helpers";

/**
 * GET …/core/marketing/dishes?group=<id>  |  ?q=<search>
 * Dishes for the promotion form's dish MultiSelect: by group (cascade) or by free-text search.
 * Scoped to promotions-manager (thin wrapper — see §10.4).
 */
export default async function GetMarketingDishesController(req: any, res: any) {
  const t = (key: string) => (req?.i18n?.__ ? req.i18n.__(key) : key);
  try {
    if (!hasAccess(req, res, "promotions-manager")) return;

    const group = String(req.query.group || "").trim();
    const q = String(req.query.q || "").trim();

    const where: any = { isDeleted: false };
    if (group) {
      where.parentGroup = group;
    } else if (q) {
      where.or = [{ name: { contains: q } }, { code: { contains: q } }];
    } else {
      return res.status(400).json({ error: t("Provide a group or a search query") });
    }

    const dishes = await Dish.find({ where, limit: 100 }).sort("name ASC");
    const results = dishes.map((d: any) => ({
      id: d.id,
      name: d.name || d.id,
      code: d.code || "",
      parentGroup: d.parentGroup || null,
    }));

    return res.json({ results });
  } catch (error) {
    sails.log.error("Get marketing dishes error", error);
    return res.status(500).json({ error: String(error) });
  }
}
