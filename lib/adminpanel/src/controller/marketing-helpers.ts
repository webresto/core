// Shared helpers for the Marketing module controllers (Promo codes + Promotions).
// Mirrors the conventions of the notifications-manager controllers: access guard,
// JSON-field parsing, safe number coercion, and discount summaries. The `${routePrefix}/core`
// middleware already sets no-store on every /core route, so controllers don't set it again.

import { IconfigDiscount } from "../../../../interfaces/ConfigDiscount";

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

export function toNumber(value: any): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function parseJsonArray(value: any): any[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string" && value.trim()) {
    try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; } catch { /* ignore */ }
  }
  return [];
}

export function parseJsonObject(value: any): any {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  if (typeof value === "string" && value.trim()) {
    try { const parsed = JSON.parse(value); return parsed && typeof parsed === "object" ? parsed : null; } catch { /* ignore */ }
  }
  return null;
}

/** Local YYYY-MM-DD bucket key for a Unix-ms timestamp (matches get-notification-stats). */
export function dayKey(ms: number): string {
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** A promotion code is "valid now" when the current date is within its start/stop window. */
export function promotionCodeStatus(code: any, now: Date = new Date()): "active" | "scheduled" | "expired" {
  const start = parseDateLoose(code?.startDate);
  const stop = parseDateLoose(code?.stopDate);
  const ts = now.getTime();
  if (start && ts < start) return "scheduled";
  if (stop && ts > stop) return "expired";
  return "active";
}

function parseDateLoose(value: any): number | null {
  if (!value) return null;
  const ms = Date.parse(String(value));
  return Number.isNaN(ms) ? null : ms;
}

/**
 * Compact, locale-agnostic structured summary of a promotion's discount, derived from
 * `configDiscount`. The frontend formats currency/percent and translates the scope label.
 */
export function discountSummary(configDiscount: IconfigDiscount | null | undefined): {
  type: "flat" | "percentage" | null;
  amount: number;
  scope: "all" | "dishes" | "groups" | "mixed" | "none";
  dishesCount: number;
  groupsCount: number;
  deliveryMethod: string[];
  hasGift: boolean;
  giftDishesCount: number;
  giftMinBasketTotal: number;
  minBasketTotal: number;
} {
  const cd: any = configDiscount || {};
  const giftDishes = cd.gift && Array.isArray(cd.gift.dishes) ? cd.gift.dishes.filter((g: any) => g && g.dishId) : [];
  const dishes = Array.isArray(cd.dishes) ? cd.dishes.filter((x: any) => x && x !== "*") : [];
  const groups = Array.isArray(cd.groups) ? cd.groups.filter((x: any) => x && x !== "*") : [];
  const allDishes = !cd.dishes || cd.dishes.length === 0 || (Array.isArray(cd.dishes) && cd.dishes.includes("*"));
  const allGroups = !cd.groups || cd.groups.length === 0 || (Array.isArray(cd.groups) && cd.groups.includes("*"));

  let scope: "all" | "dishes" | "groups" | "mixed" | "none";
  if (allDishes && allGroups) scope = "all";
  else if (dishes.length && groups.length) scope = "mixed";
  else if (dishes.length) scope = "dishes";
  else if (groups.length) scope = "groups";
  else scope = "all";

  const type = cd.discountType === "flat" || cd.discountType === "percentage" ? cd.discountType : null;
  return {
    type,
    amount: toNumber(cd.discountAmount),
    scope,
    dishesCount: dishes.length,
    groupsCount: groups.length,
    deliveryMethod: Array.isArray(cd.deliveryMethod) ? cd.deliveryMethod.filter((x: any) => typeof x === "string") : [],
    hasGift: giftDishes.length > 0,
    giftDishesCount: giftDishes.length,
    giftMinBasketTotal: toNumber(cd.gift?.minBasketTotal),
    minBasketTotal: toNumber(cd.minBasketTotal),
  };
}

/** Map a Promotion record into the shape used by promotions-options / promotion lists. */
export function mapPromotionOption(promotion: any): any {
  return {
    id: promotion?.id,
    name: promotion?.name || promotion?.id || "",
    badge: promotion?.badge || "",
    createdByUser: Boolean(promotion?.createdByUser),
    enable: promotion?.enable !== false,
    isJoint: Boolean(promotion?.isJoint),
    isPublic: Boolean(promotion?.isPublic),
    concept: parseJsonArray(promotion?.concept),
    description: promotion?.description || "",
    discount: discountSummary(parseJsonObject(promotion?.configDiscount) || promotion?.configDiscount),
  };
}
