import { hasAccess, parseJsonArray, parseJsonObject, discountSummary, toNumber } from "./marketing-helpers";

const CONFIGURED_BADGE = "configured-promotion";

/** Set of promotion ids currently registered as live handlers in the adapter. */
function activePromotionIds(): Set<string> {
  try {
    const adapter = Adapter.getPromotionAdapter();
    return new Set(adapter.getActivePromotionsIds());
  } catch {
    return new Set();
  }
}

/** Full promotion shape for the Promotions module (list + detail + form). */
export function mapPromotionFull(promotion: any, activeIds?: Set<string>): any {
  const configDiscount = parseJsonObject(promotion?.configDiscount) || (promotion?.configDiscount && typeof promotion.configDiscount === "object" ? promotion.configDiscount : {}) || {};
  const exclude = configDiscount?.exclude && typeof configDiscount.exclude === "object" ? configDiscount.exclude : {};
  return {
    id: promotion?.id,
    name: promotion?.name || "",
    description: promotion?.description || "",
    badge: promotion?.badge || "",
    createdByUser: Boolean(promotion?.createdByUser),
    enable: promotion?.enable !== false,
    isJoint: Boolean(promotion?.isJoint),
    isPublic: Boolean(promotion?.isPublic),
    concept: parseJsonArray(promotion?.concept),
    sortOrder: toNumber(promotion?.sortOrder),
    externalId: promotion?.externalId || "",
    worktime: promotion?.worktime ?? null,
    isDeleted: Boolean(promotion?.isDeleted),
    runtimeActive: activeIds ? activeIds.has(promotion?.id) : undefined,
    discount: discountSummary(configDiscount),
    // Broken-out configDiscount fields for the form (configured promotions).
    configDiscount: {
      discountType: configDiscount?.discountType === "flat" || configDiscount?.discountType === "percentage" ? configDiscount.discountType : "percentage",
      discountAmount: toNumber(configDiscount?.discountAmount),
      dishes: Array.isArray(configDiscount?.dishes) ? configDiscount.dishes : [],
      groups: Array.isArray(configDiscount?.groups) ? configDiscount.groups : [],
      deliveryMethod: Array.isArray(configDiscount?.deliveryMethod) ? configDiscount.deliveryMethod : [],
      excludeModifiers: Boolean(configDiscount?.excludeModifiers),
      exclude: {
        dishes: Array.isArray(exclude?.dishes) ? exclude.dishes : [],
        groups: Array.isArray(exclude?.groups) ? exclude.groups : [],
      },
      // Minimum basket for promo-code application (top-level).
      minBasketTotal: toNumber(configDiscount?.minBasketTotal),
      // Gift: free dishes auto-added above a basket threshold.
      gift: configDiscount?.gift && Array.isArray(configDiscount.gift.dishes)
        ? {
            minBasketTotal: toNumber(configDiscount.gift.minBasketTotal),
            dishes: configDiscount.gift.dishes
              .filter((g: any) => g && g.dishId)
              .map((g: any) => ({ dishId: String(g.dishId), amount: toNumber(g.amount) || 1 })),
          }
        : null,
    },
  };
}

/**
 * GET …/core/marketing/promotions
 * Lists promotions (programmed + configured), enriched with runtime adapter state.
 * Query: q, kind (programmed|configured), enable (on|off), concept.
 */
export default async function GetMarketingPromotionsController(req: any, res: any) {
  try {
    if (!hasAccess(req, res, "promotions-manager")) return;

    const q = String(req.query.q || "").trim().toLowerCase();
    const kind = String(req.query.kind || "").trim().toLowerCase();
    const enable = String(req.query.enable || "").trim().toLowerCase();
    const concept = String(req.query.concept || "").trim();

    const promotions = await Promotion.find({ where: { isDeleted: false } }).sort("sortOrder ASC");
    const activeIds = activePromotionIds();
    const mapped = promotions.map((p: any) => mapPromotionFull(p, activeIds));

    const filtered = mapped.filter((p: any) => {
      if (kind === "configured" && !p.createdByUser) return false;
      if (kind === "programmed" && p.createdByUser) return false;
      if (enable === "on" && !p.enable) return false;
      if (enable === "off" && p.enable) return false;
      if (concept && !(Array.isArray(p.concept) && p.concept.includes(concept))) return false;
      if (!q) return true;
      const haystack = [p.name, p.description, p.badge].map((x) => String(x || "").toLowerCase()).join(" ");
      return haystack.includes(q);
    });

    return res.json({
      results: filtered,
      meta: { total: filtered.length, configuredBadge: CONFIGURED_BADGE },
    });
  } catch (error) {
    sails.log.error("Get marketing promotions error", error);
    return res.status(500).json({ error: String(error) });
  }
}
