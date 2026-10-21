import { WorkTimeValidator, WorkTime } from "@webresto/worktime";

/**
 * Whether hours (`worktime` of a point, a delivery zone, a promotion) are open at a moment - by default, this one.
 * No hours - always open.
 *
 * The validator throws rather than answering when the hours say nothing about the day - a point that works Monday to
 * Friday, asked on a Sunday. That is closed, not broken.
 */
export function openByHours(worktime: WorkTime[] | null | undefined, at?: Date): boolean {
  if (!worktime || !worktime.length) return true;

  try {
    return WorkTimeValidator.isWorkNow({ worktime } as any, at).workNow !== false;
  } catch {
    return false;
  }
}

/** whether a record has hours at all: without them it is always open, and nothing turns it */
export function hasHours(worktime: unknown): boolean {
  return Array.isArray(worktime) && worktime.length > 0;
}
