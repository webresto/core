import type { WorkTime } from "@webresto/worktime";
import {
  PROMOCODE_MIN_BASKET_TOTAL,
  PROMOCODE_PROMOTION_DISABLED,
  PROMOCODE_PROMOTION_HOURS,
  PROMOCODE_SERVICE_TYPE,
  PROMOCODE_SETS_ASIDE,
} from "../promotion-code";
import type { DiscountSummary } from "./promotions";
import { toNumber } from "./values";

/**
 * What marketing reads as words: the term of a code, its hours, what a promotion gives, and why a code gave nothing.
 *
 * The admin panel formats such things in its own front end, which the phone has not got: a declaration carries values
 * and the client knows a money and a date from a number, but not "пн-пт 10:00-22:00" or "-10% на всю корзину". Those
 * are built here, once, so the web and the phone cannot drift apart on them.
 *
 * Every phrase is an English key of core's catalogs (`lib/locales/*.json`), and {@link MarketingWords.t} is the
 * translator of the asked language (`lib/i18n/translator.ts`). Money is formatted by the caller: the sign of the
 * currency is a setting, and these functions stay pure.
 */
export interface MarketingWords {
  /** English phrase to the language of the answer; identity by default, which leaves English. */
  t?: (phrase: string) => string;
  /** 1449 to "1 449 ₽"; the plain number by default. */
  money?: (amount: number) => string;
}

type Day = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

const DAYS: Day[] = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

/** Three letters of a weekday, as the panel's own forms name them. */
const DAY_PHRASE: Record<Day, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};

const SERVICE_PHRASE: Record<string, string> = {
  delivery: "Delivery",
  pickup: "Pickup",
  "dine-in": "Dine-in",
};

const DAY_OF_MONTH = /^(\d{4})-(\d{2})-(\d{2})$/;

function translator(words: MarketingWords | undefined): (phrase: string) => string {
  return words?.t ?? ((phrase: string) => phrase);
}

function amountWords(amount: number, words: MarketingWords | undefined): string {
  return words?.money ? words.money(amount) : String(amount);
}

/** `%s` of a phrase, filled in order. The catalogs keep the placeholders, so a translation may move them. */
export function fill(phrase: string, ...args: Array<string | number>): string {
  let index = 0;
  return phrase.replace(/%s/g, () => String(args[index++] ?? ""));
}

/** A day of a code's term as the admin wrote it, read back: "2026-10-22" to "22.10.2026". Anything else is kept. */
export function dayWords(value: string | null | undefined): string {
  const day = DAY_OF_MONTH.exec(String(value ?? "").trim());
  return day ? `${day[3]}.${day[2]}.${day[1]}` : String(value ?? "").trim();
}

/**
 * The term of a code in one line: "from 22.10.2026 to 31.10.2026", one bound alone, or "no time limit".
 *
 * The bounds are days of the timezone of the process and not moments (`lib/promotion-code.ts`), so they are never
 * given to a client as a date and time - it would invent an hour for them.
 */
export function periodWords(code: { startDate?: string | null; stopDate?: string | null }, words?: MarketingWords): string {
  const t = translator(words);
  const start = dayWords(code.startDate);
  const stop = dayWords(code.stopDate);
  if (start && stop) return fill(t("from %s to %s"), start, stop);
  if (start) return fill(t("from %s"), start);
  if (stop) return fill(t("until %s"), stop);
  return t("no time limit");
}

/** The days of one rule, shortest way round: "Mon-Fri", "Mon, Wed, Fri", "every day". */
function daysWords(dayOfWeek: unknown, words?: MarketingWords): string {
  const t = translator(words);
  const asked = (Array.isArray(dayOfWeek) ? dayOfWeek : [dayOfWeek])
    .map((day) => String(day ?? "").trim().toLowerCase())
    .filter(Boolean);
  if (!asked.length || asked.includes("all")) return t("every day");
  const chosen = DAYS.filter((day) => asked.includes(day));
  if (!chosen.length) return asked.join(", ");
  if (chosen.length === DAYS.length) return t("every day");
  const runs: Day[][] = [];
  for (const day of chosen) {
    const last = runs[runs.length - 1];
    if (last && DAYS.indexOf(day) === DAYS.indexOf(last[last.length - 1]) + 1) last.push(day);
    else runs.push([day]);
  }
  return runs
    .map((run) => (run.length > 2 ? `${t(DAY_PHRASE[run[0]])}-${t(DAY_PHRASE[run[run.length - 1]])}` : run.map((day) => t(DAY_PHRASE[day])).join(", ")))
    .join(", ");
}

/**
 * Hours as words: "Mon-Fri 10:00-22:00", several rules through a semicolon, "around the clock" when there are none -
 * which is what no hours mean everywhere in core (`openByHours`).
 */
export function scheduleWords(worktime: WorkTime | WorkTime[] | null | undefined, words?: MarketingWords): string {
  const t = translator(words);
  const rules = (Array.isArray(worktime) ? worktime : [worktime]).filter((rule) => rule && typeof rule === "object") as WorkTime[];
  if (!rules.length) return t("around the clock");
  return rules
    .map((rule) => {
      const hours = [rule.start, rule.stop].filter(Boolean).join("-");
      const rest = rule.break ? ` (${fill(t("break %s"), String(rule.break))})` : "";
      return `${daysWords(rule.dayOfWeek, words)} ${hours}${rest}`.trim();
    })
    .join("; ");
}

/** The size of a discount: "-10%" or "-150 ₽". Empty when the promotion discounts nothing (a gift alone). */
export function discountAmountWords(discount: Pick<DiscountSummary, "type" | "amount">, words?: MarketingWords): string {
  if (!discount.type || !discount.amount) return "";
  return discount.type === "percentage" ? `−${discount.amount}%` : `−${amountWords(discount.amount, words)}`;
}

const SCOPE_PHRASE: Record<string, string> = {
  all: "%s off the whole basket",
  dishes: "%s off the chosen products",
  groups: "%s off the chosen groups",
  mixed: "%s off the chosen products and groups",
  none: "%s off the whole basket",
};

/** The gift of a promotion in words: "Gift: 2 item(s) from 1 449 ₽". Empty when there is none. */
export function giftWords(discount: DiscountSummary, words?: MarketingWords): string {
  if (!discount.hasGift) return "";
  const t = translator(words);
  const threshold = discount.giftMinBasketTotal || discount.minBasketTotal;
  return threshold > 0
    ? fill(t("Gift: %s item(s) from %s"), discount.giftItemsCount, amountWords(threshold, words))
    : fill(t("Gift: %s item(s)"), discount.giftItemsCount);
}

/**
 * What a promotion gives, in one line: "-10% off the whole basket", "Gift: 2 item(s) from 1 449 ₽", both of them
 * through a comma. A promotion whose config gives nothing says so rather than answering empty.
 */
export function discountWords(discount: DiscountSummary, words?: MarketingWords): string {
  const t = translator(words);
  const amount = discountAmountWords(discount, words);
  const parts = [amount ? fill(t(SCOPE_PHRASE[discount.scope] ?? SCOPE_PHRASE.all), amount) : "", giftWords(discount, words)].filter(Boolean);
  return parts.length ? parts.join(", ") : t("nothing");
}

/** Why a promotion of a code gave nothing, from the entry core wrote into the order's `promotionState`. */
export function reasonWords(state: { type?: string; state?: any } | null | undefined, words?: MarketingWords): string {
  const t = translator(words);
  const type = state?.type;
  const data = state?.state ?? {};
  switch (type) {
    case PROMOCODE_MIN_BASKET_TOTAL:
      return fill(t("the basket is below %s"), amountWords(toNumber(data.minBasketTotal), words));
    case PROMOCODE_SERVICE_TYPE:
      return fill(
        t("only for %s"),
        (Array.isArray(data.serviceTypes) ? data.serviceTypes : []).map((kind: string) => t(SERVICE_PHRASE[kind] ?? kind)).join(", "),
      );
    case PROMOCODE_PROMOTION_HOURS:
      return t("out of the promotion's hours");
    case PROMOCODE_PROMOTION_DISABLED:
      return t("the promotion is switched off");
    case PROMOCODE_SETS_ASIDE:
      return fill(
        t("the code does not stack with: %s"),
        (Array.isArray(data.promotions) ? data.promotions : []).map((promotion: any) => String(promotion?.name ?? "")).filter(Boolean).join(", "),
      );
    default:
      return "";
  }
}

/** The way a receiving kind is named on a screen: "Delivery", "Pickup", "Dine-in". */
export function serviceTypeWords(kinds: string[] | null | undefined, words?: MarketingWords): string {
  const t = translator(words);
  return (kinds ?? []).map((kind) => t(SERVICE_PHRASE[kind] ?? kind)).join(", ");
}
