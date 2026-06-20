import { hasAccess, toNumber } from "./marketing-helpers";
import { mapPromotionFull } from "./get-marketing-promotions";

/**
 * POST …/core/marketing/promotion-toggle   { id, enable?, sortOrder? }
 * Toggles enable and/or updates sortOrder for ANY promotion (programmed or configured).
 * These are the only fields editable on a programmed promotion (§8.0).
 */
export default async function ToggleMarketingPromotionController(req: any, res: any) {
  const t = (key: string) => (req?.i18n?.__ ? req.i18n.__(key) : key);
  try {
    if (!hasAccess(req, res, "promotions-manager")) return;

    const id = String(req.body?.id || "").trim();
    if (!id) return res.status(400).json({ error: t("Promotion id is required") });

    const promotion = await Promotion.findOne({ id });
    if (!promotion) return res.status(404).json({ error: t("Promotion not found") });

    const patch: Record<string, any> = {};
    if (typeof req.body?.enable === "boolean") patch.enable = req.body.enable;
    if (req.body?.sortOrder !== undefined && req.body?.sortOrder !== null && req.body?.sortOrder !== "") {
      patch.sortOrder = toNumber(req.body.sortOrder);
    }
    if (Object.keys(patch).length === 0) return res.status(400).json({ error: t("Nothing to update") });

    await Promotion.update({ id }, patch).fetch();

    const fresh = await Promotion.findOne({ id });
    let activeIds: Set<string> | undefined;
    try { activeIds = new Set(Adapter.getPromotionAdapter().getActivePromotionsIds()); } catch { activeIds = undefined; }

    return res.json({ success: true, result: mapPromotionFull(fresh, activeIds) });
  } catch (error) {
    sails.log.error("Toggle marketing promotion error", error);
    return res.status(500).json({ error: String(error) });
  }
}
