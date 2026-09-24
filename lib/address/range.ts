import { AddressRange } from "../../interfaces/Geo";

/**
 * The house number inside what was typed: "145а" → 145, "лени" → null.
 *
 * A range is matched by this number and never by its own name — nobody types
 * "1–99", they type the number of their house.
 */
export function leadingNumber(query: string | undefined | null): number | null {
  const found = /^\s*(\d+)/.exec(query ?? "");
  return found ? Number(found[1]) : null;
}

/** Whether a `range` node covers a house number. */
export function rangeCovers(range: AddressRange, value: number): boolean {
  if (typeof range.lo === "number" && value < range.lo) return false;
  if (typeof range.hi === "number" && value > range.hi) return false;
  return true;
}
