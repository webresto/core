import OrderAddress from "../../interfaces/OrderAddress";
import { DeliveryCoordinate } from "../delivery/contracts";
import type GeoAdapter from "./GeoAdapter";
import { LEAF_WITH_POINT, formatAddressPath } from "./address";

/**
 * Turning an address into a coordinate.
 *
 * Nothing here knows what a zone is. `kitchen-assignment` needs a coordinate for
 * an address whatever delivery adapter is in use, so this is common to all of
 * them, and the geocoder it falls back to is the geo adapter's.
 */

export function isValidCoordinate(value: unknown): value is DeliveryCoordinate {
  if (!value || typeof value !== "object") return false;
  const coordinate = value as Partial<DeliveryCoordinate>;
  return (
    typeof coordinate.lat === "number" &&
    Number.isFinite(coordinate.lat) &&
    coordinate.lat >= -90 &&
    coordinate.lat <= 90 &&
    typeof coordinate.lon === "number" &&
    Number.isFinite(coordinate.lon) &&
    coordinate.lon >= -180 &&
    coordinate.lon <= 180
  );
}

function trimmed(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}

/** The coordinate the client sent with the address, when it is a usable one. */
export function coordinateFromAddress(address: OrderAddress | null | undefined): DeliveryCoordinate | null {
  const coordinate = address?.coordinate;
  return isValidCoordinate(coordinate) ? coordinate : null;
}

/** Where an address turned out to be, and whether the attempt failed outright. */
export interface AddressLocation {
  coordinate: DeliveryCoordinate | null;
  /** Set when the geocoder was asked and could not place the address. */
  unrecognized: boolean;
  diagnostics: string[];
}

/**
 * Finds the coordinate of an address, in this order:
 *
 * 1. the coordinate the address already carries;
 * 2. the `point` of the catalog node the customer chose, or of the nearest node
 *    above it that has one;
 * 3. the geo adapter, on the node's path plus the house number.
 *
 * The point is inherited because that is what the graph already says: a table on
 * a food court, a cabin in a hotel, a doorway of a house are all at the place
 * they hang from. Making every one of them carry a copy of its parent's
 * coordinate would be the same fact written twice, and the second copy is the
 * one that goes stale.
 *
 * The catalog comes before the geocoder because it is the only one of the three
 * that gives the same answer twice. A house entered in the catalog is a fact an
 * operator put there; Nominatim's answer for the same words is a guess that can
 * change between two recounts of one basket.
 *
 * The last step is skipped unless both halves are known. A street without a
 * house number points at a line on the map, and a house number without a street
 * is meaningless — geocoding either one puts the order somewhere plausible and
 * wrong.
 */
export async function locateAddress(
  geo: GeoAdapter,
  address: OrderAddress | undefined | null,
): Promise<AddressLocation> {
  const diagnostics: string[] = [];

  const supplied = coordinateFromAddress(address);
  if (supplied) {
    diagnostics.push("address point source: given");
    return { coordinate: supplied, unrecognized: false, diagnostics };
  }

  const node = trimmed(address?.node);
  const path = node ? await Address.path(node) : [];
  const chosen = path[path.length - 1];

  // From the chosen node upwards: the first ancestor with a point is where it
  // stands. A tent with its own coordinate answers for itself, a table on a
  // food court is at the mall.
  for (let step = path.length - 1; step >= 0; step--) {
    const above = path[step];
    if (isValidCoordinate(above.point)) {
      diagnostics.push(`address point source: address-node (${above.type} "${above.name}")`);
      return { coordinate: above.point, unrecognized: false, diagnostics };
    }
  }

  // The words to geocode. With a node they are its path — a leaf carries the
  // house number in its own name, so it becomes `home` and leaves the street
  // behind it. A range is a span of numbers, not a word on any map, so it drops
  // out and the number the customer typed stands in for it.
  const names = path.filter((step) => step.type !== "range").map((step) => step.name);
  let home = trimmed(address?.home);
  if (!home && chosen && LEAF_WITH_POINT.includes(chosen.type)) {
    home = names.pop();
  }
  const street = names.length ? formatAddressPath(names) : trimmed(address?.formatted);

  if (!street || !home) {
    diagnostics.push("address has no coordinate, no node with a point and no street with a house number");
    return { coordinate: null, unrecognized: false, diagnostics };
  }

  // The customer's city, and only theirs. Qualifying "Republic street" with an
  // installation-wide city is what sends it to the wrong town.
  const city = trimmed(address?.city);

  let geocoded: DeliveryCoordinate | null;
  try {
    geocoded = await geo.geocode({ street, home, city });
  } catch (error) {
    diagnostics.push(`geocoder failed: ${error instanceof Error ? error.message : String(error)}`);
    return { coordinate: null, unrecognized: true, diagnostics };
  }

  if (!isValidCoordinate(geocoded)) {
    diagnostics.push(`geocoder found nothing for "${street} ${home}"`);
    return { coordinate: null, unrecognized: true, diagnostics };
  }

  diagnostics.push(
    `geocoder placed "${street} ${home}"${city ? ` (${city})` : ""} at ${geocoded.lat}, ${geocoded.lon}`,
    "address point source: geocoder",
  );
  return { coordinate: geocoded, unrecognized: false, diagnostics };
}
