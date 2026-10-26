import { WorkTimeValidator, WorkTime } from "@webresto/worktime";

/**
 * Whether hours (`worktime` of a point, a promotion) are open at a moment - by default, this one.
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

/**
 * The moments strictly inside (from, to) the hours can turn at: the start, the stop and the bounds of the break of every
 * entry, on every day - more moments than they turn at (the day of the week of an entry is not asked), never fewer. By
 * the process clock, the restaurant's (`TZ`). No hours - none: always open.
 */
export function hoursBounds(worktime: WorkTime[] | null | undefined, from: Date, to: Date): number[] {
  if (!worktime || !worktime.length) return [];

  const times = new Set<string>();
  for (const hours of worktime) {
    times.add(String(hours.start));
    times.add(String(hours.stop));
    if (hours.break) for (const time of String(hours.break).split("-")) times.add(time);
  }

  const bounds: number[] = [];
  const day = new Date(from);
  day.setHours(0, 0, 0, 0);
  for (; day.getTime() < to.getTime(); day.setDate(day.getDate() + 1)) {
    for (const time of times) {
      const [hour, minute] = time.split(":").map(Number);
      if (!Number.isFinite(hour) || !Number.isFinite(minute)) continue;
      const moment = new Date(day);
      moment.setHours(hour, minute, 0, 0);
      if (moment.getTime() > from.getTime() && moment.getTime() < to.getTime()) bounds.push(moment.getTime());
    }
  }
  return bounds;
}

/** whether a record has hours at all: without them it is always open, and nothing turns it */
export function hasHours(worktime: unknown): boolean {
  return Array.isArray(worktime) && worktime.length > 0;
}
