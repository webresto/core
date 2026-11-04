import type { OrderRecord } from "../../models/Order";
import { isPromotionCodeNotice } from "../promotion-code";
import { type MarketingWords, reasonWords } from "./words";
import { dayKey, parseJsonArray, toNumber } from "./values";

/**
 * Where a promo code was typed, and what it gave (plan C20, `marketing.plan.md`).
 *
 * There is no model of a redemption: a code lives on the order that carries it - `promotionCodeString` is what was
 * typed, `promotionCode` is filled only when the code was taken, and `promotionState` holds why a promotion of it
 * gave nothing. The admin panel derives its "Activity" tab and its statistics from exactly that
 * (`get-promocodes-activity.ts`, `get-promocodes-stats.ts`); this module is the one place that does the deriving, so
 * the web, the phone and the future data layer count the same applications.
 *
 * Both selections are capped, as the web's are: `capped` tells a screen it is showing a part.
 */

/** How many orders one selection reads. */
export const APPLICATIONS_SCAN_LIMIT = 20000;
/** How many codes the summary counts. */
export const CODES_SCAN_LIMIT = 5000;
/** How many codes a top list keeps. */
export const TOP_CODES = 8;

export interface ApplicationView {
  orderId: string;
  /** The number the guest and the kitchen call the order by. */
  shortId: string;
  orderState: string;
  code: string;
  description: string;
  /** What the code took off; 0 when it was not taken. */
  discount: number;
  /** `applied` - the order holds the code; `invalid` - it was typed and refused. */
  status: "applied" | "invalid";
  createdAt: number | null;
  /** The entries of `promotionState` that tell about the code, raw - the words are {@link applicationWords}. */
  notices: Array<{ type?: string; message?: string; state?: any }>;
}

export interface ApplicationWords {
  /** "the basket is below 1 449 ₽", "only for Delivery", "the promotion is switched off"; empty when it applied. */
  why: string;
}

/** What a code took off the order: the discount of the basket, or the flat discount of a promotion. */
function orderDiscount(order: any): number {
  const total = toNumber(order?.discountTotal);
  return total > 0 ? total : toNumber(order?.promotionFlatDiscount);
}

/** Whether the order holds the code it carries the string of. */
function wasApplied(order: any): boolean {
  return order?.promotionCode !== null && order?.promotionCode !== undefined && order?.promotionCode !== "";
}

export function applicationView(order: any): ApplicationView {
  const applied = wasApplied(order);
  return {
    orderId: order?.id,
    shortId: order?.shortId || "",
    orderState: order?.state || "",
    code: order?.promotionCodeString || "",
    description: order?.promotionCodeDescription || "",
    discount: applied ? orderDiscount(order) : 0,
    status: applied ? "applied" : "invalid",
    createdAt: order?.createdAt ?? null,
    notices: parseJsonArray(order?.promotionState).filter((state: any) => isPromotionCodeNotice(state)),
  };
}

/**
 * Why the code gave nothing, in words: the notices of the order, through a semicolon. A code that was taken and gave
 * a discount has nothing to say - an applied code with a notice (one promotion of several out of its hours, say)
 * still does.
 */
export function applicationWords(view: ApplicationView, words?: MarketingWords): ApplicationWords {
  const t = words?.t ?? ((phrase: string) => phrase);
  const reasons = view.notices.map((notice) => reasonWords(notice, words)).filter(Boolean);
  if (reasons.length) return { why: [...new Set(reasons)].join("; ") };
  return { why: view.status === "applied" ? "" : t("the code is not valid or has expired") };
}

export interface ApplicationsQuery {
  /** Exactly this code, as typed. */
  code?: string;
  status?: "applied" | "invalid";
  /** Days, `YYYY-MM-DD`, inclusive; the timezone of the process. */
  from?: string;
  to?: string;
  /** Part of a code, of an order number or of a code's description. */
  q?: string;
  limit?: number;
}

const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** A day of a query as the first moment of it; null when it is not a day. */
export function dayStart(value: string | null | undefined): number | null {
  const day = DAY.exec(String(value ?? "").trim());
  if (!day) return null;
  const moment = new Date(Number(day[1]), Number(day[2]) - 1, Number(day[3]));
  return Number.isNaN(moment.getTime()) ? null : moment.getTime();
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The applications of a code, or of every code, newest first.
 *
 * The filters that a column holds go into the query; the rest - a free-text search, the status, which is a fact about
 * two columns at once - is done over the batch, as the web does it.
 */
export async function promotionCodeApplications(
  query: ApplicationsQuery = {},
): Promise<{ items: ApplicationView[]; capped: boolean }> {
  const limit = query.limit ?? APPLICATIONS_SCAN_LIMIT;
  const where: Record<string, any> = { promotionCodeString: { "!=": null } };
  if (query.code) where.promotionCodeString = query.code;
  const from = dayStart(query.from);
  const to = dayStart(query.to);
  if (from !== null || to !== null) {
    const range: Record<string, number> = {};
    if (from !== null) range[">="] = from;
    if (to !== null) range["<"] = to + DAY_MS;
    where.createdAt = range;
  }

  const orders: OrderRecord[] = await Order.find!({ where } as any).sort("createdAt DESC").limit(limit);
  const q = query.q?.trim().toLowerCase();
  const items = orders
    .map(applicationView)
    .filter((view) => !query.status || view.status === query.status)
    .filter((view) => !q || [view.code, view.shortId, view.description].map((text) => String(text || "").toLowerCase()).join(" ").includes(q));
  return { items, capped: orders.length >= limit };
}

/** The application of one order: the promo part of it, for a card that is not the order's own. */
export async function promotionCodeApplication(orderId: string): Promise<ApplicationView | null> {
  const order = await Order.findOne!({ id: orderId } as any);
  if (!order || !order.promotionCodeString) return null;
  return applicationView(order);
}

export interface PromotionCodeStats {
  range: { days: number; start: number };
  /** How many codes were typed, how many were taken, and what they cost. */
  applications: number;
  applied: number;
  invalid: number;
  totalDiscount: number;
  avgDiscount: number;
  /** A code was typed on more orders than one selection reads: a screen says so. */
  capped: boolean;
  series: Array<{ date: string; applications: number; discount: number }>;
  topCodes: Array<{ code: string; applications: number; discount: number }>;
}

/**
 * The money and the count of the applications of the last `days`, by day and by code.
 *
 * The range starts at the first moment of the day `days - 1` ago, in the timezone of the process: the restaurant's
 * "last seven days", not the last 168 hours.
 */
export async function promotionCodeStats({ days = 30, now = Date.now() }: { days?: number; now?: number } = {}): Promise<PromotionCodeStats> {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  const rangeStart = start.getTime();

  const orders: OrderRecord[] = await Order.find!({
    where: { promotionCodeString: { "!=": null }, createdAt: { ">=": rangeStart } },
  } as any)
    .sort("createdAt ASC")
    .limit(APPLICATIONS_SCAN_LIMIT);

  const byDay = new Map<string, { date: string; applications: number; discount: number }>();
  for (let index = 0; index < days; index += 1) {
    const day = new Date(rangeStart);
    day.setDate(day.getDate() + index);
    const key = dayKey(day.getTime());
    if (key) byDay.set(key, { date: key, applications: 0, discount: 0 });
  }

  const byCode = new Map<string, { code: string; applications: number; discount: number }>();
  let applied = 0;
  let totalDiscount = 0;

  for (const order of orders) {
    const view = applicationView(order);
    if (view.status === "applied") applied += 1;
    totalDiscount += view.discount;

    const key = view.createdAt ? dayKey(Number(view.createdAt)) : "";
    const day = key ? byDay.get(key) : undefined;
    if (day) {
      day.applications += 1;
      day.discount += view.discount;
    }

    if (view.code) {
      const code = byCode.get(view.code) ?? { code: view.code, applications: 0, discount: 0 };
      code.applications += 1;
      code.discount += view.discount;
      byCode.set(view.code, code);
    }
  }

  return {
    range: { days, start: rangeStart },
    applications: orders.length,
    applied,
    invalid: orders.length - applied,
    totalDiscount,
    avgDiscount: orders.length > 0 ? totalDiscount / orders.length : 0,
    capped: orders.length >= APPLICATIONS_SCAN_LIMIT,
    series: [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date)),
    topCodes: [...byCode.values()].sort((a, b) => b.applications - a.applications || b.discount - a.discount).slice(0, TOP_CODES),
  };
}
