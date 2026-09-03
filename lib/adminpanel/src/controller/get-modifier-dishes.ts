import { getDefaultCookingPlaceId } from "../../../cooking-place";
import { getEffectiveBalances, readEffectiveBalance } from "../../../dish-place-balance";

/**
 * GET …/core/modifiers/dishes?group=<id>&q=<search>&ids=<id,id,...>&onlyModifiers=0
 * Dishes usable as modifier options in the modifiers editor's option picker: by group,
 * free-text search, or exact ids. Any non-deleted dish can be an option (many RMS
 * catalogs — e.g. gfcafe/iiko — have zero dishes flagged `modifier: true`, and the old
 * modifiers-only default made the picker return nothing there); dishes flagged
 * `modifier: true` are sorted first. Pass onlyModifiers=1 to narrow to flagged dishes
 * only. Exact-id lookups always resolve regardless of flags so already-referenced
 * options stay visible. Access is gated by the `catalog-products` token.
 *
 * Besides picker fields, returns price/weight/measureUnit/images/notForSale/description
 * so the modifiers preview popup can render option cards and compute the total price.
 * `images` is the size→URL dict of the dish's most recent MediaFile (paths under the
 * public static root), or null when the dish has no images.
 */

/**
 * Waterline `contains` is case-SENSITIVE on Postgres (LIKE, not ILIKE), so an admin
 * typing "ка" would miss "Картошка…" at word start. Search several case variants —
 * portable across datastores, no native SQL.
 */
function caseVariants(q: string): string[] {
  return Array.from(new Set([
    q,
    q.toLowerCase(),
    q.toUpperCase(),
    q.charAt(0).toUpperCase() + q.slice(1).toLowerCase(),
  ]));
}

function pickImages(dish: any): Record<string, string> | null {
  const list = Array.isArray(dish.images) ? [...dish.images] : [];
  if (!list.length) return null;
  // Most recent image first — same ordering Dish.display uses.
  if (list.length >= 2) list.sort((a, b) => String(b.uploadDate || "").localeCompare(String(a.uploadDate || "")));
  const variant = list[0]?.variant ?? list[0]?.images;
  if (!variant || typeof variant !== "object" || !Object.keys(variant).length) return null;
  return variant;
}
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
    const onlyModifiers = String(req.query.onlyModifiers ?? "0") === "1";
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
      if (q) {
        where.or = caseVariants(q).flatMap((v) => [
          { name: { contains: v } },
          { code: { contains: v } },
        ]);
      }
    }

    const dishes = await Dish.find({ where, limit: 200 }).populate("images").sort("name ASC");
    // Stock lives per cooking point; the picker shows it for the default one.
    const balances = await getEffectiveBalances(
      dishes.map((d: any) => String(d.id)),
      await getDefaultCookingPlaceId(),
    );
    // Flagged modifier dishes first (stable within: name ASC from the query above).
    if (!ids.length) dishes.sort((a: any, b: any) => Number(Boolean(b.modifier)) - Number(Boolean(a.modifier)));
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
      balance: readEffectiveBalance(balances, d.id),
      price: typeof d.price === "number" ? d.price : 0,
      weight: typeof d.weight === "number" ? d.weight : null,
      measureUnit: d.measureUnit || null,
      notForSale: Boolean(d.notForSale),
      description: d.description || null,
      images: pickImages(d),
    }));

    return res.json({ results });
  } catch (error) {
    sails.log.error("Get modifier dishes error", error);
    return res.status(500).json({ error: String(error) });
  }
}
