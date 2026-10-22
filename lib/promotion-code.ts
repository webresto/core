import type { WorkTime } from "@webresto/worktime";
import { openByHours } from "./hours";

/** Codes are compared trimmed and upper-cased; an empty one is no code. */
export function normalizePromotionCodeValue(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).trim().toUpperCase();
  return normalized || null;
}

/** what a promo code's switch, dates and hours are read from */
export interface PromotionCodeTerms {
  enable?: boolean | null;
  startDate?: string | null;
  stopDate?: string | null;
  /** one rule of the week, as the admin writes it */
  workTime?: WorkTime | null;
}

export type PromotionCodeStatus = "active" | "disabled" | "scheduled" | "expired";

const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * A bound of a code's dates as a moment. A day without a time (the admin's date field writes "2026-10-22") is a day
 * of the process timezone, as the rest of core reads time: the start bound - its first moment, the stop bound - its
 * last, so the stop day is in.
 */
function dateBound(value: string | null | undefined, stop: boolean): number | null {
  if (!value) return null;
  const day = DAY.exec(value.trim());
  if (day) return new Date(Number(day[1]), Number(day[2]) - 1, Number(day[3]) + (stop ? 1 : 0)).getTime() - (stop ? 1 : 0);
  const moment = Date.parse(value);
  return Number.isNaN(moment) ? null : moment;
}

/** Where a promo code stands at a moment by its switch and its dates: the admin's status of a code. */
export function promotionCodeStatus(code: PromotionCodeTerms, now: Date = new Date()): PromotionCodeStatus {
  if (code.enable === false) return "disabled";
  const start = dateBound(code.startDate, false);
  if (start !== null && now.getTime() < start) return "scheduled";
  const stop = dateBound(code.stopDate, true);
  if (stop !== null && now.getTime() > stop) return "expired";
  return "active";
}

/** Whether a promo code applies at a moment: active by its status and within its hours. */
export function promotionCodeWorks(code: PromotionCodeTerms, now: Date = new Date()): boolean {
  return promotionCodeStatus(code, now) === "active" && openByHours(code.workTime ? [code.workTime] : null, now);
}
