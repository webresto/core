import { v4 as uuid } from "uuid";
import { hasAccess, toNumber } from "./marketing-helpers";
import { mapPromotionFull } from "./get-marketing-promotions";

const CONFIGURED_BADGE = "configured-promotion";

function stringArray(value: any): string[] {
  return Array.isArray(value) ? value.filter((x: any) => typeof x === "string" && x.trim()).map((x: string) => x.trim()) : [];
}

/**
 * POST …/core/marketing/promotion   (upsert — configured promotions only)
 * Body: { id?, name, description, concept[], isJoint, isPublic, enable, sortOrder, worktime,
 *         configDiscount: { discountType, discountAmount, dishes[], groups[], deliveryMethod[],
 *                           excludeModifiers, exclude: { dishes[], groups[] } } }
 *
 * Persists the config via Promotion.createOrUpdate (which computes `hash` and recreates the
 * runtime ConfiguredPromotion handler), then writes enable/sortOrder/worktime separately —
 * createOrUpdate intentionally strips those "user space" fields.
 */
export default async function UpsertMarketingPromotionController(req: any, res: any) {
  const t = (key: string) => (req?.i18n?.__ ? req.i18n.__(key) : key);
  try {
    if (!hasAccess(req, res, "promotions-manager")) return;

    const body = req.body || {};
    const id = String(body.id || "").trim();

    const name = String(body.name || "").trim();
    if (!name) return res.status(400).json({ error: t("Name is required") });
    const description = String(body.description || "").trim();
    if (!description) return res.status(400).json({ error: t("Description is required") });

    const existing = id ? await Promotion.findOne({ id }) : null;
    if (id && !existing) return res.status(404).json({ error: t("Promotion not found") });
    if (existing && !existing.createdByUser) {
      return res.status(403).json({ error: t("Programmed promotions cannot be edited") });
    }

    // ── Normalize configDiscount ──
    const cd = body.configDiscount && typeof body.configDiscount === "object" ? body.configDiscount : {};
    const discountType = cd.discountType === "flat" ? "flat" : "percentage";
    const discountAmount = toNumber(cd.discountAmount);
    if (discountAmount < 0) return res.status(400).json({ error: t("Discount amount must be positive") });
    if (discountType === "percentage" && discountAmount > 100) return res.status(400).json({ error: t("Percentage discount cannot exceed 100") });

    // Core's ConfiguredPromotion.applyPromotion discounts an item only when BOTH the dish
    // and the group check pass (`if (!checkDishes || !checkGroups) continue`), while a flat
    // whole-cart discount requires both arrays empty. So: empty selection → whole cart; a
    // single-axis selection gets the other axis filled with "*" ("any") so it actually applies.
    const dishesSel = stringArray(cd.dishes);
    const groupsSel = stringArray(cd.groups);
    let dishes = dishesSel;
    let groups = groupsSel;
    if (dishesSel.length || groupsSel.length) {
      if (dishesSel.length && !groupsSel.length) groups = ["*"];
      else if (groupsSel.length && !dishesSel.length) dishes = ["*"];
    }

    const configDiscount: any = {
      discountType,
      discountAmount,
      dishes,
      groups,
    };
    const deliveryMethod = (Array.isArray(cd.deliveryMethod) ? cd.deliveryMethod : []).filter((m: any) => m === "delivery" || m === "selfService");
    if (deliveryMethod.length) configDiscount.deliveryMethod = deliveryMethod;
    if (cd.excludeModifiers) configDiscount.excludeModifiers = true;
    const exDishes = stringArray(cd.exclude?.dishes);
    const exGroups = stringArray(cd.exclude?.groups);
    if (exDishes.length || exGroups.length) configDiscount.exclude = { dishes: exDishes, groups: exGroups };

    // Minimum basket total to apply the promotion via a promo code (top-level).
    const minBasketTotal = toNumber(cd.minBasketTotal);
    if (minBasketTotal > 0) configDiscount.minBasketTotal = minBasketTotal;

    // Gift: free dishes auto-added once the basket reaches the gift threshold.
    // The "free" price comes from the dish itself (operator should use a 0₽ dish).
    const giftDishes = (Array.isArray(cd.gift?.dishes) ? cd.gift.dishes : [])
      .map((g: any) => ({ dishId: String(g?.dishId || "").trim(), amount: Math.max(1, Math.trunc(toNumber(g?.amount)) || 1) }))
      .filter((g: any) => g.dishId);
    if (giftDishes.length) {
      configDiscount.gift = { minBasketTotal: toNumber(cd.gift?.minBasketTotal), dishes: giftDishes };
    }

    let concept = stringArray(body.concept);
    if (concept.length === 0) concept = ["origin"];

    const values: any = {
      name,
      description,
      concept,
      isJoint: Boolean(body.isJoint),
      isPublic: Boolean(body.isPublic),
      createdByUser: true,
      badge: CONFIGURED_BADGE,
      configDiscount,
      externalId: existing?.externalId || `configured-${uuid()}`,
    };
    if (existing) values.id = existing.id;

    const saved = await Promotion.createOrUpdate(values);

    // enable / sortOrder / worktime are stripped by createOrUpdate — persist them explicitly.
    const enable = body.enable !== false;
    const sortOrder = toNumber(body.sortOrder);
    const worktime = body.worktime ?? null;
    await Promotion.update({ id: saved.id }, { enable, sortOrder, worktime, isDeleted: false }).fetch();

    const fresh = await Promotion.findOne({ id: saved.id });
    let activeIds: Set<string> | undefined;
    try { activeIds = new Set(Adapter.getPromotionAdapter().getActivePromotionsIds()); } catch { activeIds = undefined; }

    return res.json({ success: true, result: mapPromotionFull(fresh, activeIds) });
  } catch (error) {
    sails.log.error("Upsert marketing promotion error", error);
    return res.status(500).json({ error: String(error) });
  }
}
