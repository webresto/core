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
/** Wall-clock time in the timezone at the given instant. */
export declare function wallClockAt(at: Date, timezone: string): WallClock;
/** Parse "YYYY-MM-DD HH:mm[:ss]" (or with "T"); null for anything else. */
export declare function parseWallClock(value: unknown): WallClock | null;
/** Offset of the timezone from UTC at the instant, in minutes (Moscow: 180). */
export declare function timezoneOffsetMinutes(at: Date, timezone: string): number;
/** "+03:00" for the timezone at the instant. */
export declare function timezoneOffsetString(at: Date, timezone: string): string;
/**
 * The instant of a wall-clock time in the timezone. A time skipped by a daylight
 * saving jump resolves to the instant after the jump.
 */
export declare function wallClockToInstant(wall: Pick<WallClock, "date" | "time">, timezone: string): Date;
/**
 * The instant of `order.date` in the timezone. A value with an explicit offset or
 * "Z" is an instant already; anything unparseable gives an invalid Date.
 */
export declare function orderDateToInstant(date: string, timezone: string): Date;
/**
 * Open intervals of the day in minutes since 00:00, the same way the storefront
 * builds the time slots: a day that ends past midnight (stop <= start) runs until
 * the end of the day and its tail opens the next day, and the break is cut out.
 */
export declare function workRanges(worktime: WorkTime[], date: string): [number, number][];
/**
 * Whether the worktime is open at the wall-clock time. No worktime - always open,
 * a day without an entry - closed.
 *
 * `inclusive` takes both ends of an interval: an order to time may be exactly at
 * opening or closing, the storefront offers these slots. Without it the closing
 * minute is out: "now" at 23:00 is closed for a place that works until 23:00.
 */
export declare function isOpenAt(worktime: WorkTime[] | null | undefined, wall: Pick<WallClock, "date" | "minutes">, { inclusive }?: {
    inclusive?: boolean;
}): boolean;
