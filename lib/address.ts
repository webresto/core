/**
 * The rules of an address graph.
 *
 * Addresses live in one flat table: every node knows its city and its parent,
 * and what may follow a node is answered by its children, not by a description
 * of the city's structure. These constants are the only thing that is decided in
 * code, and they are decided per type rather than per city — in Tolyatti a city
 * has `street` and `quarter` children at once, in Nha Trang a `commune` has
 * `alley` children, and neither needs a different answer for what a `house` is.
 */

export const ADDRESS_TYPES = [
  "district",
  "quarter",
  "ward",
  "commune",
  "street",
  "alley",
  "house",
  "building",
  "entrance",
  "unit",
  "range",
  "place",
] as const;

export type AddressType = (typeof ADDRESS_TYPES)[number];

/**
 * Found by a search that starts at the city.
 *
 * `house`, `building`, `entrance` and `unit` are missing on purpose: typing "10"
 * with nothing chosen yet would otherwise offer every house number in the city.
 * A node the city holds directly is found at the root whatever its type — that
 * is a different rule, and it lives in `Address.search`.
 */
export const ROOT_SEARCHABLE: AddressType[] = [
  "district",
  "quarter",
  "ward",
  "commune",
  "street",
  "alley",
  "place",
];

/** Types that are not offered at the root of a city by their type alone. */
export const CHILD_ONLY: AddressType[] = ["house", "building", "entrance", "unit", "range"];

/** Leaves that carry their own coordinate, so the geocoder is never asked. */
export const LEAF_WITH_POINT: AddressType[] = ["house", "entrance", "unit", "place"];

/**
 * Nodes that are the place to knock at all by themselves.
 *
 * Choosing one of these answers the question a house number asks, so checkout
 * stops asking it and `formatted` does not repeat it. A street or a quarter does
 * not: `building` and `entrance` are here because they only ever hang under a
 * house, which is already in the path. `range` is deliberately not — a range of
 * house numbers is the one node that exists to have a number typed after it.
 */
export const SELF_ADDRESSED: AddressType[] = ["house", "building", "entrance", "unit", "place"];

/** Which half of the street a `range` covers. */
export const ADDRESS_PARITIES = ["any", "odd", "even"] as const;

export type AddressParity = (typeof ADDRESS_PARITIES)[number];

/** How many suggestions one query returns. */
export const ADDRESS_SEARCH_LIMIT = 20;

/** Same shape as `Place.coordinate`: one way to spell a point in this schema. */
export interface AddressPoint {
  lat: number;
  lng: number;
}

/** The bounds a `range` node covers. `null` on either side means unbounded. */
export interface AddressRange {
  lo?: number | null;
  hi?: number | null;
  parity?: AddressParity | null;
}

/** "Ленина", "12" → "Ленина, 12". Empty parts drop out. */
export function formatAddressPath(names: (string | undefined | null)[]): string {
  return names
    .map((name) => (typeof name === "string" ? name.trim() : ""))
    .filter((name) => name !== "")
    .join(", ");
}

/**
 * The line an operator and a courier read, out of a chosen path and a house
 * number.
 *
 * Two rules, and they are the reason this is here rather than in `Order`: a
 * `range` leaves no word behind — "1–99, нечётные" is how the catalog groups
 * houses, not an address — and a node that is the place to knock at already
 * carries its number, so the number is not written twice.
 */
export function formatAddressLine(
  path: { type: AddressType; name: string }[],
  home?: string | null,
): string {
  const names = path.filter((step) => step.type !== "range").map((step) => step.name);
  const leaf = path[path.length - 1];
  if (home && !(leaf && SELF_ADDRESSED.includes(leaf.type))) names.push(home);
  return formatAddressPath(names);
}

/**
 * The house number inside what was typed: "145а" → 145, "лени" → null.
 *
 * A range is matched by this number and never by its own name — nobody types
 * "1–99, нечётные", they type the number of their house.
 */
export function leadingNumber(query: string | undefined | null): number | null {
  const found = /^\s*(\d+)/.exec(query ?? "");
  return found ? Number(found[1]) : null;
}

/** Whether a `range` node covers a house number. */
export function rangeCovers(range: AddressRange, value: number): boolean {
  if (typeof range.lo === "number" && value < range.lo) return false;
  if (typeof range.hi === "number" && value > range.hi) return false;
  if (range.parity === "odd" && value % 2 === 0) return false;
  if (range.parity === "even" && value % 2 !== 0) return false;
  return true;
}

/**
 * House numbers in the order a person reads them: 1, 2, 2а, 10, 11.
 *
 * Sorting them as strings puts 10 before 2, which in a list of twenty houses is
 * the difference between finding yours and scrolling for it. Names that do not
 * start with a digit — streets, districts — fall back to a plain comparison and
 * sit after the numbered ones.
 */
export function compareAddressNames(a: string, b: string): number {
  const left = /^(\d+)(.*)$/.exec(a ?? "");
  const right = /^(\d+)(.*)$/.exec(b ?? "");

  if (left && right) {
    const byNumber = Number(left[1]) - Number(right[1]);
    return byNumber !== 0 ? byNumber : left[2].localeCompare(right[2]);
  }
  if (left) return -1;
  if (right) return 1;
  return (a ?? "").localeCompare(b ?? "");
}
