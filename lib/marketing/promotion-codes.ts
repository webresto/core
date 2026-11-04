import type { WorkTime } from "@webresto/worktime";
import type { PromotionCodeRecord } from "../../models/PromotionCode";
import { normalizePromotionCodeValue, promotionCodeStatus, promotionCodeWorks, type PromotionCodeStatus } from "../promotion-code";
import { type DiscountSummary, discountSummary, promotionApplies, type PromotionApplies } from "./promotions";
import { discountWords, type MarketingWords, periodWords, scheduleWords } from "./words";
import { isOn, parseJsonArray, parseJsonObject } from "./values";

/**
 * Reading the promo codes of the Marketing section (plan C18, `marketing.plan.md`).
 *
 * The panel's controller used to map a code itself, and the phone needs the same four answers: does the code act now,
 * what is it linked to, what does that give, and - since C22 - whether anything of it is switched on at all. A code
 * does nothing by itself: it switches on the promotions it is linked to (`docs/Promocodes.md`), so a code whose every
 * promotion is off gives nothing, and that is said in words rather than left for the guest to find at the checkout.
 */

/** A promotion as a code's row and card show it. */
export interface PromotionCodeLinkedPromotion {
  id: string;
  name: string;
  badge: string;
  createdByUser: boolean;
  /** "Works" - off, it applies neither by itself nor by this code (C22). */
  enable: boolean;
  onlyByCode: boolean;
  applies: PromotionApplies;
  discount: DiscountSummary | null;
}

export interface PromotionCodeView {
  id: string;
  code: string;
  description: string;
  type: string;
  externalId: string;
  prefix: string;
  /** Older records have no value and are on: the web reads them so, and so does this. */
  enable: boolean;
  startDate: string;
  stopDate: string;
  workTime: WorkTime | null;
  /** The switch and the dates, as the panel's status column shows it. */
  status: PromotionCodeStatus;
  /** The status *and* the hours: a code "active" from 10:00 does nothing at nine. */
  worksNow: boolean;
  promotion: PromotionCodeLinkedPromotion[];
  promotionIds: string[];
  /** Whether any promotion of the code can give something: false - the code is a dead letter. */
  givesSomething: boolean;
  generateConfig: any;
  customData: any;
  createdAt: number | null;
  updatedAt: number | null;
}

/** The words of a code: its term, its hours, and what it gives. */
export interface PromotionCodeWords {
  /** "from 22.10.2026 to 31.10.2026", "no time limit". */
  period: string;
  /** "Mon-Fri 10:00-22:00", "around the clock". */
  schedule: string;
  /** "-10% off the whole basket", or why the code gives nothing. */
  gives: string;
}

/** How many codes one selection reads; the same cap the web has had (`get-promocodes.ts`). */
export const PROMOTION_CODES_FETCH_LIMIT = 2000;

function linkedPromotion(promotion: any, now?: Date): PromotionCodeLinkedPromotion {
  if (!promotion || typeof promotion !== "object") {
    const id = String(promotion ?? "");
    return { id, name: id, badge: "", createdByUser: false, enable: true, onlyByCode: false, applies: "self", discount: null };
  }
  return {
    id: promotion.id,
    name: promotion.name || promotion.id || "",
    badge: promotion.badge || "",
    createdByUser: Boolean(promotion.createdByUser),
    enable: isOn(promotion.enable),
    onlyByCode: promotion.onlyByCode === true,
    applies: promotionApplies(
      { enable: promotion.enable, onlyByCode: promotion.onlyByCode, worktime: Array.isArray(promotion.worktime) ? promotion.worktime : parseJsonArray(promotion.worktime) },
      now,
    ),
    discount: discountSummary(parseJsonObject(promotion.configDiscount) || promotion.configDiscount),
  };
}

/** One code as every reader of it sees it. `now` is given by the tests; by default, this moment. */
export function promotionCodeView(code: any, options: { now?: Date } = {}): PromotionCodeView {
  const now = options.now ?? new Date();
  const promotions = (Array.isArray(code?.promotion) ? code.promotion : []).map((promotion: any) => linkedPromotion(promotion, now));
  const workTime = (parseJsonObject(code?.workTime) as WorkTime) ?? null;
  return {
    id: code?.id,
    code: code?.code || "",
    description: code?.description || "",
    type: code?.type || "static",
    externalId: code?.externalId || "",
    prefix: code?.prefix || "",
    enable: isOn(code?.enable),
    startDate: code?.startDate || "",
    stopDate: code?.stopDate || "",
    workTime,
    status: promotionCodeStatus(code, now),
    worksNow: promotionCodeWorks({ ...code, workTime }, now),
    promotion: promotions,
    promotionIds: promotions.map((promotion: PromotionCodeLinkedPromotion) => promotion.id),
    // A promotion of a code works switched on and within its own hours; the basket also asks the
    // minimum and the way of receiving, which a code on its own cannot know.
    givesSomething: promotions.some((promotion: PromotionCodeLinkedPromotion) => promotion.enable),
    generateConfig: code?.generateConfig ?? null,
    customData: code?.customData ?? null,
    createdAt: code?.createdAt ?? null,
    updatedAt: code?.updatedAt ?? null,
  };
}

/** The words of {@link promotionCodeView}, in the language of the answer. */
export function promotionCodeWords(view: PromotionCodeView, words?: MarketingWords): PromotionCodeWords {
  const t = words?.t ?? ((phrase: string) => phrase);
  const gives = !view.promotion.length
    ? t("the code is linked to no promotion")
    : !view.givesSomething
      ? t("every promotion of the code is switched off — the code gives nothing")
      : view.promotion
          .filter((promotion) => promotion.enable && promotion.discount)
          .map((promotion) => discountWords(promotion.discount as DiscountSummary, words))
          .join("; ");
  return {
    period: periodWords(view, words),
    schedule: scheduleWords(view.workTime, words),
    gives,
  };
}

export interface PromotionCodesQuery {
  /** Part of a code, of its description, of its external id or of the name of a promotion it is linked to. */
  q?: string;
  status?: PromotionCodeStatus;
  enable?: boolean;
  type?: string;
  /** `with` - linked to at least one promotion; `without` - linked to none. */
  binding?: "with" | "without";
  limit?: number;
  now?: Date;
}

function matchesCode(view: PromotionCodeView, query: PromotionCodesQuery): boolean {
  if (query.status && view.status !== query.status) return false;
  if (query.enable === true && !view.enable) return false;
  if (query.enable === false && view.enable) return false;
  if (query.type && view.type !== query.type) return false;
  if (query.binding === "with" && view.promotion.length === 0) return false;
  if (query.binding === "without" && view.promotion.length > 0) return false;
  const q = query.q?.trim().toLowerCase();
  if (!q) return true;
  const haystack = [view.code, view.description, view.externalId, ...view.promotion.map((promotion) => promotion.name)]
    .map((text) => String(text || "").toLowerCase())
    .join(" ");
  return haystack.includes(q);
}

/**
 * The codes of the section, newest first, filtered in memory.
 *
 * Codes are few and the search reaches into the names of the promotions they are linked to and into a status nothing
 * is indexed by, so a generous batch is read and sliced here - exactly as the web has always done it. `capped` says
 * the batch was full, and a screen has to say so rather than quietly show a part.
 */
export async function listPromotionCodes(query: PromotionCodesQuery = {}): Promise<{ items: PromotionCodeView[]; capped: boolean }> {
  const limit = query.limit ?? PROMOTION_CODES_FETCH_LIMIT;
  const codes: PromotionCodeRecord[] = await PromotionCode.find!({} as any).populate("promotion").sort("createdAt DESC").limit(limit);
  const items = codes.map((code) => promotionCodeView(code, { now: query.now })).filter((view) => matchesCode(view, query));
  return { items, capped: codes.length >= limit };
}

/** One code with its promotions. */
export async function getPromotionCode(id: string, options: { now?: Date } = {}): Promise<PromotionCodeView | null> {
  const code = await PromotionCode.findOne!({ id } as any).populate("promotion");
  return code ? promotionCodeView(code, options) : null;
}

/**
 * Whether the code value is taken by another record (plan C19).
 *
 * `code` is neither unique nor required in the model, and `getValidPromotionCode` takes `findOne` - two records with
 * one value would make the apply ambiguous. The panel's controller has guarded that since the module was written;
 * the guard lives here now, so creating a code from a phone refuses exactly as the web does.
 */
export async function promotionCodeTaken(code: string | null | undefined, exceptId?: string | null): Promise<boolean> {
  const normalized = normalizePromotionCodeValue(code);
  if (!normalized) return false;
  const existing = await PromotionCode.findOne!({ code: normalized } as any);
  return Boolean(existing && existing.id !== exceptId);
}

/** The counts a summary screen shows: how many codes there are and how many act now. */
export async function promotionCodeCounts(now?: Date): Promise<{ total: number; active: number; worksNow: number; capped: boolean }> {
  const { items, capped } = await listPromotionCodes({ now });
  return {
    total: items.length,
    active: items.filter((view) => view.status === "active").length,
    worksNow: items.filter((view) => view.worksNow).length,
    capped,
  };
}
