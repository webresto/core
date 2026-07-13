/**
 * GET …/core/tags?q=<search>
 * Distinct tag names already used across catalog dishes (with usage counts) for the
 * tags-editor autocomplete. Access is gated by the `catalog-products` token — the same
 * one that guards the product catalog — so a user who cannot see the catalog cannot
 * enumerate its tags.
 */
export default async function GetDishTagsController(req: any, res: any) {
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

    const q = String(req.query.q || "").trim().toLowerCase();

    // Dish.tags is json: iiko v1 writes string arrays, iiko v2 writes allergen
    // objects ({ id, code, name }), the storefront contract is { name }[].
    // `select` is valid Waterline criteria at runtime but missing from the local typings.
    const dishes = await Dish.find({ where: { isDeleted: false }, select: ["id", "tags"] } as any);

    const counts = new Map<string, { name: string; count: number }>();
    for (const dish of dishes as any[]) {
      const raw = Array.isArray(dish.tags) ? dish.tags : [];
      const seenInDish = new Set<string>();
      for (const entry of raw) {
        const name =
          typeof entry === "string" || typeof entry === "number"
            ? String(entry).trim()
            : entry && typeof entry === "object"
              ? String((entry as any).name ?? "").trim()
              : "";
        if (!name) continue;
        const key = name.toLowerCase();
        if (seenInDish.has(key)) continue;
        seenInDish.add(key);
        const bucket = counts.get(key);
        if (bucket) bucket.count += 1;
        else counts.set(key, { name, count: 1 });
      }
    }

    const results = [...counts.values()]
      .filter((tag) => !q || tag.name.toLowerCase().includes(q))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
      .slice(0, 30);

    return res.json({ results });
  } catch (error) {
    sails.log.error("Get dish tags error", error);
    return res.status(500).json({ error: String(error) });
  }
}
