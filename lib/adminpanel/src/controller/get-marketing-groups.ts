import { hasAccess } from "./marketing-helpers";

/**
 * GET …/core/marketing/groups
 * Flat list of catalog groups (id + name + parentGroup) for the promotion form's group
 * MultiSelect. Scoped to promotions-manager (a thin wrapper so marketing managers don't need
 * the stock-manager token — see §10.4).
 */
export default async function GetMarketingGroupsController(req: any, res: any) {
  try {
    if (!hasAccess(req, res, "promotions-manager")) return;

    const groups = await Group.find({ where: { isDeleted: false } }).sort("name ASC");
    const results = groups.map((g: any) => ({
      id: g.id,
      name: g.name || g.id,
      parentGroup: g.parentGroup || null,
      concept: g.concept ?? null,
    }));

    return res.json({ results });
  } catch (error) {
    sails.log.error("Get marketing groups error", error);
    return res.status(500).json({ error: String(error) });
  }
}
