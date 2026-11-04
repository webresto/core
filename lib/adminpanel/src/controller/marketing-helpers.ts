// Shared helpers for the Marketing module controllers (Promo codes + Promotions).
//
// What a promotion and a promo code *are* is answered by core itself now — `lib/marketing/*` (plan C18 of
// `marketing.plan.md`) — because the mobile API asks the same questions and two readers of one record must not
// disagree about whether it is switched on. What is left here is the access guard of a panel route; the coercions
// and the mappers are re-exported so the controllers (and modules outside core) keep their imports.

export { toNumber, parseJsonArray, parseJsonObject, dayKey } from "../../../marketing/values";
export { discountSummary, promotionOption as mapPromotionOption } from "../../../marketing/promotions";

/**
 * Auth + permission guard. Returns false (and writes the response) when access is denied.
 * `token` is the access-rights token to require (e.g. "promocodes-manager").
 */
export function hasAccess(req: any, res: any, token: string): boolean {
  const { config } = req.adminizer || {};
  if (config?.auth?.enable && !req.user) {
    res.redirect(`${config.routePrefix}/model/userap/login`);
    return false;
  }
  if (req.adminizer?.accessRightsHelper && !req.adminizer.accessRightsHelper.hasPermission(token, req.user)) {
    res.sendStatus(403);
    return false;
  }
  return true;
}
