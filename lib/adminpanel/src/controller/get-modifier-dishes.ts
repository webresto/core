/**
 * GET …/core/modifiers/dishes?group=<id>&q=<search>&ids=<id,id,...>&onlyModifiers=1
 * Dishes usable as modifier options in the modifiers editor's option picker: by group,
 * free-text search, or exact ids. By default only dishes flagged `modifier: true` are
 * returned (onlyModifiers=1 default); pass onlyModifiers=0 to list any dish. Exact-id
 * lookups always resolve regardless of the modifier flag so already-referenced options
 * stay visible. Access is gated by the `catalog-products` token.
 */
export default async function GetModifierDishesController(req: any, res: any) {
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

    const group = String(req.query.group || "").trim();
    const q = String(req.query.q || "").trim();
    const onlyModifiers = String(req.query.onlyModifiers ?? "1") !== "0";
    const ids = String(req.query.ids || "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean)
      .slice(0, 200);

    let where: any;
    if (ids.length) {
      // Exact lookup resolves referenced options even if they are not flagged as modifiers.
      where = { id: ids };
    } else {
      where = { isDeleted: false };
      if (onlyModifiers) where.modifier = true;
      if (group) where.parentGroup = group;
      if (q) where.or = [{ name: { contains: q } }, { code: { contains: q } }];
    }

    const dishes = await Dish.find({ where, limit: 200 }).sort("name ASC");
    const results = dishes.map((d: any) => ({
      id: d.id,
      rmsId: d.rmsId || "",
      name: d.name || d.id,
      code: d.code || "",
      parentGroup: d.parentGroup || null,
      modifier: Boolean(d.modifier),
      isDeleted: Boolean(d.isDeleted),
      enable: d.enable !== false,
      visible: d.visible !== false,
      balance: typeof d.balance === "number" ? d.balance : null,
    }));

    return res.json({ results });
  } catch (error) {
    sails.log.error("Get modifier dishes error", error);
    return res.status(500).json({ error: String(error) });
  }
}
