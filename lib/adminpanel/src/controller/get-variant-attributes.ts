/**
 * GET …/core/variants/attributes
 * The attributes of the dishes that have variants: one list of `options` per dish, for the
 * suggestions of the variants-editor control. There is no dictionary of attributes - each dish
 * keeps its own - so a new box is offered what the other boxes already use, and the same size
 * gets the same key and the same values across the menu. The control merges the lists.
 * Access is gated by the `catalog-products` token, as the catalog itself is.
 */
export default async function GetVariantAttributesController(req: any, res: any) {
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

    // json is not a criterion of a portable query: the boxes are picked out of the rows.
    // `select` is valid Waterline criteria at runtime but missing from the local typings.
    const dishes: any[] = await Dish.find!({ where: { isDeleted: false, parentId: null }, select: ["id", "variants"] } as any);
    const results = dishes.map((dish) => dish.variants?.options).filter((options) => Array.isArray(options) && options.length);

    return res.json({ results });
  } catch (error) {
    sails.log.error("Get variant attributes error", error);
    return res.status(500).json({ error: String(error) });
  }
}
