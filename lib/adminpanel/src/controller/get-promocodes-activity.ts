import { hasAccess, parseJsonArray, parseJsonObject } from "./marketing-helpers";
import { promotionCodeApplications } from "../../../marketing/applications";

const PAGE_SIZE_DEFAULT = 50;
const PAGE_SIZE_MAX = 200;

/**
 * GET …/core/marketing/promocodes/activity
 * Feed of promo-code applications, derived from orders carrying a promotionCodeString — core answers it
 * (`lib/marketing/applications.ts`, plan C20), so the web and the phone count the same applications.
 * Query: q (code/order short id), code (exact), status (applied|invalid), from, to, skip, limit.
 */
export default async function GetPromoCodesActivityController(req: any, res: any) {
  try {
    if (!hasAccess(req, res, "promocodes-manager")) return;

    const requestedLimit = Number.parseInt(String(req.query.limit || String(PAGE_SIZE_DEFAULT)), 10);
    const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), PAGE_SIZE_MAX) : PAGE_SIZE_DEFAULT;
    const requestedSkip = Number.parseInt(String(req.query.skip || "0"), 10);
    const skip = Number.isFinite(requestedSkip) && requestedSkip >= 0 ? requestedSkip : 0;

    const status = String(req.query.status || "").trim().toLowerCase();
    const { items, capped } = await promotionCodeApplications({
      q: String(req.query.q || ""),
      code: String(req.query.code || "").trim() || undefined,
      status: status === "applied" || status === "invalid" ? status : undefined,
      from: String(req.query.from || "") || undefined,
      to: String(req.query.to || "") || undefined,
    });

    // The front end of the module reads the whole `promotionState` and the errors of the order, not only the
    // notices about the code: it shows them as they are, under the row.
    const results = items.slice(skip, skip + limit).map((item) => ({
      orderId: item.orderId,
      shortId: item.shortId,
      state: item.orderState,
      code: item.code,
      description: item.description,
      discount: item.discount,
      status: item.status,
      createdAt: item.createdAt,
      promotionState: item.notices,
    }));

    return res.json({ results, meta: { total: items.length, skip, limit, capped } });
  } catch (error) {
    sails.log.error("Get promocodes activity error", error);
    return res.status(500).json({ error: String(error) });
  }
}
