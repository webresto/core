import type { WorkTime } from "@webresto/worktime";

/**
 * Wall-clock time of the restaurant, computed in its timezone (the TZ setting)
 * and not in the timezone of the process.
 *
 * `order.date` is such a wall-clock time ("YYYY-MM-DD HH:mm[:ss]"), and the
 * worktime is written in it too. `new Date(order.date)` reads it in the process
 * timezone and `WorkTimeValidator.isWorkNow` takes the weekday and minutes in the
 * process timezone, so both are wrong as soon as the process runs in another zone
 * (a TZ setting changed without a restart, a container without TZ, tests).
 * Everything here goes through Intl, which also knows daylight saving time, unlike
 * the fixed offset table of `TimeZoneIdentifier`.
 */
export interface WallClock {
  /** YYYY-MM-DD */
  date: string;
  /** HH:mm */
  time: string;
  /** Minutes since 00:00 */
  minutes: number;
  /** "monday" ... "sunday" */
  weekday: string;
}

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

const formatters = new Map<string, Intl.DateTimeFormat>();
function formatter(timezone: string): Intl.DateTimeFormat {
  let result = formatters.get(timezone);
  if (!result) {
    const options = {
      timeZone: timezone,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
      hourCycle: "h23",
    } as Intl.DateTimeFormatOptions;
    // sv-SE prints "YYYY-MM-DD HH:mm:ss"; throws RangeError on an unknown zone
    result = new Intl.DateTimeFormat("sv-SE", options);
    formatters.set(timezone, result);
  }
  return result;
}

function weekdayOf(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

function makeWallClock(date: string, time: string): WallClock {
  const [h, min] = time.split(":").map(Number);
  return { date, time, minutes: h * 60 + min, weekday: weekdayOf(date) };
}

/** Wall-clock time in the timezone at the given instant. */
export function wallClockAt(at: Date, timezone: string): WallClock {
  const [date, time] = formatter(timezone).format(at).split(" ");
  return makeWallClock(date, time.slice(0, 5));
}

/** Parse "YYYY-MM-DD HH:mm[:ss]" (or with "T"); null for anything else. */
export function parseWallClock(value: unknown): WallClock | null {
  if (typeof value !== "string") return null;
  const match = /^(\d{4}-\d{2}-\d{2})[ T]([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d(?:\.\d+)?)?$/.exec(value.trim());
  if (!match) return null;
  return makeWallClock(match[1], `${match[2]}:${match[3]}`);
}

/** Offset of the timezone from UTC at the instant, in minutes (Moscow: 180). */
export function timezoneOffsetMinutes(at: Date, timezone: string): number {
  const wall = formatter(timezone).format(at);
  const [date, time] = wall.split(" ");
  const [y, m, d] = date.split("-").map(Number);
  const [h, min, s] = time.split(":").map(Number);
  const asUtc = Date.UTC(y, m - 1, d, h, min, s);
  return Math.round((asUtc - Math.floor(at.getTime() / 1000) * 1000) / 60000);
}

/** "+03:00" for the timezone at the instant. */
export function timezoneOffsetString(at: Date, timezone: string): string {
  const offset = timezoneOffsetMinutes(at, timezone);
  const abs = Math.abs(offset);
  return `${offset < 0 ? "-" : "+"}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`;
}

/**
 * The instant of a wall-clock time in the timezone. A time skipped by a daylight
 * saving jump resolves to the instant after the jump.
 */
export function wallClockToInstant(wall: Pick<WallClock, "date" | "time">, timezone: string): Date {
  const [y, m, d] = wall.date.split("-").map(Number);
  const [h, min] = wall.time.split(":").map(Number);
  const asUtc = Date.UTC(y, m - 1, d, h, min);
  // Two passes settle the offset around a transition
  let instant = asUtc - timezoneOffsetMinutes(new Date(asUtc), timezone) * 60000;
  instant = asUtc - timezoneOffsetMinutes(new Date(instant), timezone) * 60000;
  return new Date(instant);
}

/**
 * The instant of `order.date` in the timezone. A value with an explicit offset or
 * "Z" is an instant already; anything unparseable gives an invalid Date.
 */
export function orderDateToInstant(date: string, timezone: string): Date {
  const wall = parseWallClock(date);
  return wall ? wallClockToInstant(wall, timezone) : new Date(date);
}

function toMinutes(time: string | undefined): number | null {
  const match = typeof time === "string" ? /^\s*(\d{1,2}):(\d{2})/.exec(time) : null;
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function dayWorkTime(worktime: WorkTime[], weekday: string): WorkTime | undefined {
  // The first entry for the day wins, as in WorkTimeValidator.getCurrentWorkTime
  return worktime.find((entry) => (entry?.dayOfWeek as unknown as string[] | string | undefined)?.includes(weekday));
}

function previousDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10);
}

/**
 * Open intervals of the day in minutes since 00:00, the same way the storefront
 * builds the time slots: a day that ends past midnight (stop <= start) runs until
 * the end of the day and its tail opens the next day, and the break is cut out.
 */
export function workRanges(worktime: WorkTime[], date: string): [number, number][] {
  const ranges: [number, number][] = [];

  const prev = dayWorkTime(worktime, weekdayOf(previousDate(date)));
  const prevStart = toMinutes(prev?.start);
  const prevStop = toMinutes(prev?.stop);
  if (prevStart !== null && prevStop !== null && prevStop < prevStart && prevStop > 0) {
    ranges.push([0, prevStop]);
  }

  const today = dayWorkTime(worktime, weekdayOf(date));
  const start = toMinutes(today?.start);
  const stop = toMinutes(today?.stop);
  if (start === null || stop === null) return ranges;
  ranges.push([start, stop > start ? stop : 24 * 60]);

  const [breakFrom, breakTo] = (today.break ?? "").split("-").map((part) => toMinutes(part));
  if (breakFrom === null || breakTo === null || breakTo <= breakFrom) return ranges;
  return ranges.flatMap(([from, to]) =>
    breakTo <= from || breakFrom >= to
      ? [[from, to] as [number, number]]
      : ([[from, breakFrom], [breakTo, to]] as [number, number][]).filter(([a, b]) => b > a),
  );
}

/**
 * Whether the worktime is open at the wall-clock time. No worktime - always open,
 * a day without an entry - closed.
 *
 * `inclusive` takes both ends of an interval: an order to time may be exactly at
 * opening or closing, the storefront offers these slots. Without it the closing
 * minute is out: "now" at 23:00 is closed for a place that works until 23:00.
 */
export function isOpenAt(
  worktime: WorkTime[] | null | undefined,
  wall: Pick<WallClock, "date" | "minutes">,
  { inclusive = false }: { inclusive?: boolean } = {},
): boolean {
  if (!Array.isArray(worktime) || !worktime.length) return true;
  return workRanges(worktime, wall.date).some(([from, to]) =>
    inclusive ? wall.minutes >= from && wall.minutes <= to : wall.minutes >= from && wall.minutes < to,
  );
}
