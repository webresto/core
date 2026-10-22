/**
 * What a profile takes: the rules of `User` the model checks and a storefront repeats before it sends.
 */

/** The longest first or last name: a name is shown in a header and a receipt, not a text. */
export const NAME_MAX_LENGTH = 200;

/** The earliest year a date of birth is taken from. */
const FIRST_YEAR = 1900;

/**
 * A date of birth as the profile keeps it: `YYYY-MM-DD`, a real day from 1900 to today in the zone of
 * the process; an empty string is no date.
 */
export function isBirthday(value: unknown, now: Date = new Date()): boolean {
  if (value === "") return true;
  if (typeof value !== "string") return false;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(year, month - 1, day);
  const real = date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  return real && year >= FIRST_YEAR && date.getTime() <= now.getTime();
}
