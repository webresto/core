import { hasAccess } from "./marketing-helpers";
import { mapPromotionCode } from "./get-promocodes";

const ALLOWED_TYPES = ["static"];

/**
 * POST …/core/marketing/promocode   (upsert)
 * Body: { id?, code, description (required), type, enable, startDate, stopDate, workTime,
 *         externalId, prefix, generateConfig, customData, promotionIds: string[] }
 *
 * Enforces code uniqueness here (the model leaves `code` non-unique + nullable, and
 * getValidPromotionCode picks a single match — duplicates would be ambiguous).
 */
export default async function UpsertPromoCodeController(req: any, res: any) {
  const t = (key: string) => (req?.i18n?.__ ? req.i18n.__(key) : key);
  try {
    if (!hasAccess(req, res, "promocodes-manager")) return;

    const body = req.body || {};
    const id = String(body.id || "").trim();

    const description = String(body.description || "").trim();
    if (!description) return res.status(400).json({ error: t("Description is required") });

    const type = ALLOWED_TYPES.includes(String(body.type || "").trim()) ? String(body.type).trim() : "static";
    const code = body.code === null || body.code === undefined ? null : String(body.code).trim().toUpperCase() || null;

    // Uniqueness guard: a code must be free, or already belong to the record being saved.
    if (code) {
      const existing = await PromotionCode.findOne({ code });
      if (existing && existing.id !== id) {
        return res.status(409).json({ error: t("This promo code is already in use"), field: "code" });
      }
    }

    const promotionIds: string[] = Array.isArray(body.promotionIds)
      ? body.promotionIds.filter((x: any) => typeof x === "string" && x.trim()).map((x: string) => x.trim())
      : [];

    const values: Record<string, any> = {
      description,
      type,
      code,
      enable: body.enable !== false,
      // startDate/stopDate are plain `string` (no allowNull) in the model — use "" when empty.
      startDate: body.startDate ? String(body.startDate) : "",
      stopDate: body.stopDate ? String(body.stopDate) : "",
      workTime: body.workTime ?? null,
      externalId: body.externalId ? String(body.externalId) : null,
      prefix: body.prefix ? String(body.prefix).trim().toUpperCase() || null : null,
      generateConfig: body.generateConfig ?? null,
      customData: body.customData ?? null,
    };

    let recordId = id;
    if (id) {
      const found = await PromotionCode.findOne({ id });
      if (!found) return res.status(404).json({ error: t("Promo code not found") });
      await PromotionCode.update({ id }, values).fetch();
    } else {
      const created = await PromotionCode.create(values).fetch();
      recordId = created.id;
    }

    // Sync the many-to-many link to promotions.
    await PromotionCode.replaceCollection(recordId, "promotion").members(promotionIds);

    const saved = await PromotionCode.findOne({ id: recordId }).populate("promotion");
    return res.json({ success: true, result: mapPromotionCode(saved) });
  } catch (error) {
    sails.log.error("Upsert promocode error", error);
    return res.status(500).json({ error: String(error) });
  }
}
