import { hasAccess, parseJsonArray, parseJsonObject, promotionCodeStatus, discountSummary } from "./marketing-helpers";

const PAGE_SIZE_DEFAULT = 50;
const PAGE_SIZE_MAX = 200;
// Promotion codes are low-volume; load a generous batch and filter/paginate in JS so
// search can reach into populated promotion names and computed validity status.
const FETCH_LIMIT = 2000;

export function mapPromotionCode(code: any): any {
  const promotions = Array.isArray(code?.promotion)
    ? code.promotion.map((p: any) => (typeof p === "object" && p ? {
        id: p.id,
        name: p.name || p.id || "",
        badge: p.badge || "",
        createdByUser: Boolean(p.createdByUser),
        enable: p.enable !== false,
        discount: discountSummary(parseJsonObject(p.configDiscount) || p.configDiscount),
      } : { id: String(p), name: String(p), badge: "", createdByUser: false, enable: true, discount: null }))
    : [];

  return {
    id: code?.id,
    code: code?.code || "",
    description: code?.description || "",
    type: code?.type || "static",
    externalId: code?.externalId || "",
    prefix: code?.prefix || "",
    // Older records have no value; they remain active after the feature rollout.
    enable: code?.enable !== false,
    startDate: code?.startDate || "",
    stopDate: code?.stopDate || "",
    workTime: code?.workTime ?? null,
    promotion: promotions,
    promotionIds: promotions.map((p: any) => p.id),
    generateConfig: code?.generateConfig ?? null,
    customData: code?.customData ?? null,
    createdAt: code?.createdAt || null,
    updatedAt: code?.updatedAt || null,
    status: promotionCodeStatus(code),
  };
}

/**
 * GET …/core/marketing/promocodes
 * List/search/filter/paginate promotion codes (populated with their promotions).
 * Query: q, status (active|disabled|scheduled|expired), enable (true|false), type,
 * binding (with|without), skip, limit.
 */
export default async function GetPromoCodesController(req: any, res: any) {
  try {
    if (!hasAccess(req, res, "promocodes-manager")) return;

    const requestedLimit = Number.parseInt(String(req.query.limit || String(PAGE_SIZE_DEFAULT)), 10);
    const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), PAGE_SIZE_MAX) : PAGE_SIZE_DEFAULT;
    const requestedSkip = Number.parseInt(String(req.query.skip || "0"), 10);
    const skip = Number.isFinite(requestedSkip) && requestedSkip >= 0 ? requestedSkip : 0;

    const q = String(req.query.q || "").trim().toLowerCase();
    const status = String(req.query.status || "").trim().toLowerCase();
    const enable = String(req.query.enable || "").trim().toLowerCase();
    const type = String(req.query.type || "").trim().toLowerCase();
    const binding = String(req.query.binding || "").trim().toLowerCase();

    const codes = await PromotionCode.find({})
      .populate("promotion")
      .sort("createdAt DESC")
      .limit(FETCH_LIMIT);

    const mapped = codes.map(mapPromotionCode);

    const filtered = mapped.filter((code: any) => {
      if (status && code.status !== status) return false;
      if (enable === "true" && !code.enable) return false;
      if (enable === "false" && code.enable) return false;
      if (type && code.type !== type) return false;
      if (binding === "with" && code.promotion.length === 0) return false;
      if (binding === "without" && code.promotion.length > 0) return false;
      if (!q) return true;
      const haystack = [
        code.code,
        code.description,
        code.externalId,
        ...code.promotion.map((p: any) => p.name),
      ].map((item) => String(item || "").toLowerCase()).join(" ");
      return haystack.includes(q);
    });

    const total = filtered.length;
    const page = filtered.slice(skip, skip + limit);

    return res.json({
      results: page,
      meta: { total, skip, limit, capped: codes.length >= FETCH_LIMIT },
    });
  } catch (error) {
    sails.log.error("Get promocodes error", error);
    return res.status(500).json({ error: String(error) });
  }
}
