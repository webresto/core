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
  "place",
] as const;

export type AddressType = (typeof ADDRESS_TYPES)[number];

/**
 * Found by a search that starts at the city.
 *
 * `house`, `building` and `entrance` are missing on purpose: typing "10" with
 * nothing chosen yet would otherwise offer every house number in the city.
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

/** Only ever found among the children of an already chosen node. */
export const CHILD_ONLY: AddressType[] = ["house", "building", "entrance"];

/** Leaves that carry their own coordinate, so the geocoder is never asked. */
export const LEAF_WITH_POINT: AddressType[] = ["house", "entrance", "place"];

/**
 * Nodes that are the place to knock at all by themselves.
 *
 * Choosing one of these answers the question a house number asks, so checkout
 * stops asking it and `formatted` does not repeat it. A street or a quarter does
 * not: `building` and `entrance` are here because they only ever hang under a
 * house, which is already in the path.
 */
export const SELF_ADDRESSED: AddressType[] = ["house", "building", "entrance", "place"];

/** How many suggestions one query returns. */
export const ADDRESS_SEARCH_LIMIT = 20;

/** Same shape as `Place.coordinate`: one way to spell a point in this schema. */
export interface AddressPoint {
  lat: number;
  lng: number;
}

/** "Ленина", "12" → "Ленина, 12". Empty parts drop out. */
export function formatAddressPath(names: (string | undefined | null)[]): string {
  return names
    .map((name) => (typeof name === "string" ? name.trim() : ""))
    .filter((name) => name !== "")
    .join(", ");
}
