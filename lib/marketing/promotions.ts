import type { WorkTime } from "@webresto/worktime";
import type { IconfigDiscount } from "../../interfaces/ConfigDiscount";
import type { PromotionRecord } from "../../models/Promotion";
import { openByHours } from "../hours";
import { discountWords, giftWords, type MarketingWords, scheduleWords, serviceTypeWords } from "./words";
import { isOn, parseJsonArray, parseJsonObject, toNumber } from "./values";

/**
 * Reading the promotions of the Marketing section - for the admin panel, for the mobile API and for anything that
 * asks next (plan C18, `marketing.plan.md`).
 *
 * It used to live in the controllers of the panel (`mapPromotionFull`, `discountSummary`, `mapPromotionOption`), and
 * a second reader - the phone - would have had to copy three answers that are easy to get subtly wrong: a switch
 * that is absent means on, a promotion that is "only by code" is not an off one, and the hours are not the switch.
 * The controllers are thin over this module now, so one promotion cannot look like two different things in the web
 * and on a phone.
 */

/** What `configDiscount` says, in the compact shape a list row and a card are built from. */
export interface DiscountSummary {
  type: "flat" | "percentage" | null;
  amount: number;
  /** `all` - the whole basket; `dishes` / `groups` / `mixed` - only what is chosen. */
  scope: "all" | "dishes" | "groups" | "mixed" | "none";
  dishesCount: number;
  groupsCount: number;
  serviceType: string[];
  hasGift: boolean;
  /** How many gift *rows* the config has: one row of two magnets is one. */
  giftDishesCount: number;
  /** How many gift items the guest gets - the amounts added up, which is what "2 items" means to a person. */
  giftItemsCount: number;
  giftMinBasketTotal: number;
  minBasketTotal: number;
}

/**
 * Where a promotion stands now - one word for a row of a list.
 *
 * `self` - it applies by itself, to the baskets it targets; `code-only` - only through its promo codes (its own
 * switch, C22); `disabled` - it applies nowhere; `out-of-hours` - it would apply, but not at this moment.
 */
export type PromotionApplies = "self" | "code-only" | "disabled" | "out-of-hours";

export interface PromotionCodeLink {
  id: string;
  code: string;
  enable: boolean;
}

export interface PromotionView {
  id: string;
  name: string;
  description: string;
  badge: string;
  /** false - a promotion a module programmed: the panel edits only its switches and its order. */
  createdByUser: boolean;
  /** "Works": switched off, it applies neither by itself nor through a code (C22). */
  enable: boolean;
  /** "Only by promo code": it does not apply by itself and is not shown on the storefront (C22). */
  onlyByCode: boolean;
  isJoint: boolean;
  isPublic: boolean;
  concept: string[];
  sortOrder: number;
  externalId: string;
  worktime: WorkTime[] | null;
  isDeleted: boolean;
  /** Whether the adapter holds a live handler of it; undefined when nobody asked the adapter. */
  runtimeActive?: boolean;
  discount: DiscountSummary;
  /** The broken-out config the editor of the panel and of the phone both write. */
  configDiscount: {
    discountType: "flat" | "percentage";
    discountAmount: number;
    dishes: string[];
    groups: string[];
    serviceType: string[];
    excludeModifiers: boolean;
    exclude: { dishes: string[]; groups: string[] };
    minBasketTotal: number;
    gift: { minBasketTotal: number; dishes: Array<{ dishId: string; amount: number }> } | null;
  };
  applies: PromotionApplies;
  /** The codes it works through; only when the record was populated. */
  promotionCode?: PromotionCodeLink[];
}

/** The words of a promotion a screen shows: built once, in the language of the answer. */
export interface PromotionWords {
  /** "Mon-Fri 10:00-22:00", "around the clock". */
  schedule: string;
  /** "-10% off the whole basket, Gift: 2 item(s) from 1 449 ₽". */
  gives: string;
  gift: string;
  /** "Delivery, Pickup"; empty - any way of receiving. */
  serviceTypes: string;
}

/**
 * Compact summary of a promotion's discount. The admin panel formats the currency and the percent itself; the words
 * of this one are {@link promotionWords}.
 */
export function discountSummary(configDiscount: IconfigDiscount | null | undefined): DiscountSummary {
  const config: any = configDiscount || {};
  const giftDishes = config.gift && Array.isArray(config.gift.dishes) ? config.gift.dishes.filter((gift: any) => gift && gift.dishId) : [];
  const dishes = Array.isArray(config.dishes) ? config.dishes.filter((item: any) => item && item !== "*") : [];
  const groups = Array.isArray(config.groups) ? config.groups.filter((item: any) => item && item !== "*") : [];
  const allDishes = !config.dishes || config.dishes.length === 0 || (Array.isArray(config.dishes) && config.dishes.includes("*"));
  const allGroups = !config.groups || config.groups.length === 0 || (Array.isArray(config.groups) && config.groups.includes("*"));

  let scope: DiscountSummary["scope"];
  if (allDishes && allGroups) scope = "all";
  else if (dishes.length && groups.length) scope = "mixed";
  else if (dishes.length) scope = "dishes";
  else if (groups.length) scope = "groups";
  else scope = "all";

  const type = config.discountType === "flat" || config.discountType === "percentage" ? config.discountType : null;
  return {
    type,
    amount: toNumber(config.discountAmount),
    scope,
    dishesCount: dishes.length,
    groupsCount: groups.length,
    serviceType: Array.isArray(config.serviceType) ? config.serviceType.filter((kind: any) => typeof kind === "string") : [],
    hasGift: giftDishes.length > 0,
    giftDishesCount: giftDishes.length,
    giftItemsCount: giftDishes.reduce((sum: number, gift: any) => sum + (Math.trunc(toNumber(gift.amount)) || 1), 0),
    giftMinBasketTotal: toNumber(config.gift?.minBasketTotal),
    minBasketTotal: toNumber(config.minBasketTotal),
  };
}

/** Where the promotion stands at `now`: its two switches first, its hours after them. */
export function promotionApplies(
  promotion: { enable?: boolean | null; onlyByCode?: boolean | null; worktime?: WorkTime[] | null },
  now?: Date,
): PromotionApplies {
  if (!isOn(promotion.enable)) return "disabled";
  if (promotion.onlyByCode === true) return "code-only";
  return openByHours(promotion.worktime, now) ? "self" : "out-of-hours";
}

function codeLinks(promotion: any): PromotionCodeLink[] | undefined {
  if (!Array.isArray(promotion?.promotionCode)) return undefined;
  return promotion.promotionCode
    .filter((code: any) => code && typeof code === "object")
    .map((code: any) => ({ id: String(code.id), code: String(code.code ?? ""), enable: isOn(code.enable) }));
}

/** One promotion as every reader of it sees it: the record's own fields, the two switches, and where it stands. */
export function promotionView(promotion: any, options: { activeIds?: Set<string>; now?: Date } = {}): PromotionView {
  const configDiscount = parseJsonObject(promotion?.configDiscount) || {};
  const exclude = parseJsonObject(configDiscount?.exclude) || {};
  const worktime = Array.isArray(promotion?.worktime) ? (promotion.worktime as WorkTime[]) : (parseJsonArray(promotion?.worktime) as WorkTime[]);
  const view: PromotionView = {
    id: promotion?.id,
    name: promotion?.name || "",
    description: promotion?.description || "",
    badge: promotion?.badge || "",
    createdByUser: Boolean(promotion?.createdByUser),
    enable: isOn(promotion?.enable),
    onlyByCode: promotion?.onlyByCode === true,
    isJoint: Boolean(promotion?.isJoint),
    isPublic: Boolean(promotion?.isPublic),
    concept: parseJsonArray(promotion?.concept),
    sortOrder: toNumber(promotion?.sortOrder),
    externalId: promotion?.externalId || "",
    worktime: worktime.length ? worktime : null,
    isDeleted: Boolean(promotion?.isDeleted),
    runtimeActive: options.activeIds ? options.activeIds.has(promotion?.id) : undefined,
    discount: discountSummary(configDiscount),
    configDiscount: {
      discountType: configDiscount?.discountType === "flat" ? "flat" : "percentage",
      discountAmount: toNumber(configDiscount?.discountAmount),
      dishes: Array.isArray(configDiscount?.dishes) ? configDiscount.dishes : [],
      groups: Array.isArray(configDiscount?.groups) ? configDiscount.groups : [],
      serviceType: Array.isArray(configDiscount?.serviceType) ? configDiscount.serviceType : [],
      excludeModifiers: Boolean(configDiscount?.excludeModifiers),
      exclude: {
        dishes: Array.isArray(exclude?.dishes) ? exclude.dishes : [],
        groups: Array.isArray(exclude?.groups) ? exclude.groups : [],
      },
      minBasketTotal: toNumber(configDiscount?.minBasketTotal),
      gift:
        configDiscount?.gift && Array.isArray(configDiscount.gift.dishes)
          ? {
              minBasketTotal: toNumber(configDiscount.gift.minBasketTotal),
              dishes: configDiscount.gift.dishes
                .filter((gift: any) => gift && gift.dishId)
                .map((gift: any) => ({ dishId: String(gift.dishId), amount: toNumber(gift.amount) || 1 })),
            }
          : null,
    },
    applies: promotionApplies(
      { enable: promotion?.enable, onlyByCode: promotion?.onlyByCode, worktime: worktime.length ? worktime : null },
      options.now,
    ),
  };
  const codes = codeLinks(promotion);
  if (codes) view.promotionCode = codes;
  return view;
}

/** The words of {@link promotionView}, in the language of the answer. */
export function promotionWords(view: PromotionView, words?: MarketingWords): PromotionWords {
  return {
    schedule: scheduleWords(view.worktime, words),
    gives: discountWords(view.discount, words),
    gift: giftWords(view.discount, words),
    serviceTypes: serviceTypeWords(view.discount.serviceType, words),
  };
}

/** A promotion as a chooser of them shows it - the options of a promo code's form. */
export function promotionOption(promotion: any): {
  id: string;
  name: string;
  badge: string;
  createdByUser: boolean;
  enable: boolean;
  onlyByCode: boolean;
  isJoint: boolean;
  isPublic: boolean;
  concept: string[];
  description: string;
  discount: DiscountSummary;
} {
  return {
    id: promotion?.id,
    name: promotion?.name || promotion?.id || "",
    badge: promotion?.badge || "",
    createdByUser: Boolean(promotion?.createdByUser),
    enable: isOn(promotion?.enable),
    onlyByCode: promotion?.onlyByCode === true,
    isJoint: Boolean(promotion?.isJoint),
    isPublic: Boolean(promotion?.isPublic),
    concept: parseJsonArray(promotion?.concept),
    description: promotion?.description || "",
    discount: discountSummary(parseJsonObject(promotion?.configDiscount) || promotion?.configDiscount),
  };
}

/** Promotion ids the adapter holds a live handler of; empty when it is not up yet. */
export function activePromotionIds(): Set<string> {
  try {
    const { Adapter } = require("../../adapters");
    return new Set(Adapter.getPromotionAdapter().getActivePromotionsIds());
  } catch {
    return new Set();
  }
}

export interface PromotionsQuery {
  /** Part of a name, a description or a badge. */
  q?: string;
  kind?: "configured" | "programmed";
  /** `self` - applies by itself; `code-only`; `off`. */
  applies?: "self" | "code-only" | "off";
  concept?: string;
  /** Whether to ask the adapter which promotions it holds; the panel does, a list does not have to. */
  withRuntime?: boolean;
  now?: Date;
}

function matchesPromotion(view: PromotionView, query: PromotionsQuery): boolean {
  if (query.kind === "configured" && !view.createdByUser) return false;
  if (query.kind === "programmed" && view.createdByUser) return false;
  if (query.applies === "off" && view.enable) return false;
  if (query.applies === "self" && (!view.enable || view.onlyByCode)) return false;
  if (query.applies === "code-only" && !(view.enable && view.onlyByCode)) return false;
  if (query.concept && !view.concept.includes(query.concept)) return false;
  const q = query.q?.trim().toLowerCase();
  if (!q) return true;
  return [view.name, view.description, view.badge].map((text) => text.toLowerCase()).join(" ").includes(q);
}

/**
 * The promotions of the section, by `sortOrder` - the order the basket applies them in. Deleted ones are never in:
 * `isDeleted` is how the panel removes a promotion a handler may still hold.
 */
export async function listPromotions(query: PromotionsQuery = {}): Promise<PromotionView[]> {
  const promotions: PromotionRecord[] = await Promotion.find!({ where: { isDeleted: false } } as any).sort("sortOrder ASC");
  const activeIds = query.withRuntime === false ? undefined : activePromotionIds();
  return promotions.map((promotion) => promotionView(promotion, { activeIds, now: query.now })).filter((view) => matchesPromotion(view, query));
}

/** One promotion with the codes it works through. */
export async function getPromotion(id: string, options: { now?: Date } = {}): Promise<PromotionView | null> {
  const promotion = await Promotion.findOne!({ id } as any).populate("promotionCode");
  if (!promotion || promotion.isDeleted) return null;
  return promotionView(promotion, { activeIds: activePromotionIds(), now: options.now });
}

/** The counts a summary screen shows: how many promotions there are, work by themselves, and only by a code. */
export async function promotionCounts(now?: Date): Promise<{ total: number; self: number; codeOnly: number; off: number }> {
  const views = await listPromotions({ withRuntime: false, now });
  return {
    total: views.length,
    self: views.filter((view) => view.applies === "self" || view.applies === "out-of-hours").length,
    codeOnly: views.filter((view) => view.applies === "code-only").length,
    off: views.filter((view) => view.applies === "disabled").length,
  };
}
