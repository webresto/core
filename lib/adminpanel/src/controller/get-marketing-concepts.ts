import { hasAccess } from "./marketing-helpers";

/**
 * GET …/core/marketing/concepts
 * Concept list for the promotion form's MultiSelect. There is no concept model — the list is
 * derived from catalog groups (+ the implicit "origin"), mirroring ProductCatalog.getIdList.
 */
export default async function GetMarketingConceptsController(req: any, res: any) {
  try {
    if (!hasAccess(req, res, "promotions-manager")) return;

    const groups = await Group.find({});
    const set = new Set<string>();
    for (const g of groups as any[]) {
      const c = (g as any).concept;
      if (Array.isArray(c)) c.forEach((x: any) => { if (x && typeof x === "string") set.add(x); });
      else if (typeof c === "string" && c) set.add(c);
    }
    set.add("origin");

    return res.json({ results: Array.from(set).sort() });
  } catch (error) {
    sails.log.error("Get marketing concepts error", error);
    return res.status(500).json({ error: String(error) });
  }
}
