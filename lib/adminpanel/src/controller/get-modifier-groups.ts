/**
 * GET …/core/modifiers/groups?q=<search>&ids=<id,id,...>
 * Flat list of catalog groups for the modifiers editor's group picker. A group is what a
 * modifier group binds to (childModifiers live under it). Access is gated by the
 * `catalog-products` token — the same one that guards the product catalog — so a user who
 * cannot see the catalog cannot enumerate modifier groups.
 */
export default async function GetModifierGroupsController(req: any, res: any) {
  try {
    const { config } = req.adminizer || {};
    if (config?.auth?.enable && !req.user) {
      return res.redirect(`${config.routePrefix}/model/userap/login`);
    }
    if (
      req.adminizer?.accessRightsHelper &&
      !req.adminizer.accessRightsHelper.hasPermission("catalog-products", req.user)
    ) {
      return res.sendStatus(403);
    }

    const q = String(req.query.q || "").trim();
    const ids = String(req.query.ids || "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean)
      .slice(0, 200);

    const where: any = ids.length ? { id: ids } : { isDeleted: false };
    if (!ids.length && q) {
      where.or = [{ name: { contains: q } }, { code: { contains: q } }];
    }

    const groups = await Group.find({ where, limit: 200 }).sort("name ASC");
    const results = groups.map((g: any) => ({
      id: g.id,
      rmsId: g.rmsId || "",
      name: g.name || g.id,
      code: g.code || "",
      parentGroup: g.parentGroup || null,
      concept: g.concept ?? null,
      isDeleted: Boolean(g.isDeleted),
    }));

    return res.json({ results });
  } catch (error) {
    sails.log.error("Get modifier groups error", error);
    return res.status(500).json({ error: String(error) });
  }
}
