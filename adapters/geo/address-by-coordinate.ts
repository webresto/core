import OrderAddress from "../../interfaces/OrderAddress";
import { AddressRecord } from "../../models/Address";
import { AddressPoint, formatAddressLine, leadingNumber, rangeCovers } from "./address";
import { isValidCoordinate } from "./delivery-location";
import { distanceKm } from "../delivery/geo";
import GeoAdapter, { GeoAddress } from "./GeoAdapter";

/**
 * The address a customer is standing at, for the storefront's "detect my
 * location". In this order:
 *
 * 1. the geo adapter's reverse answer, matched against the city's catalog: the
 *    street by its words, then the house by its number;
 * 2. the nearest catalog node with a point, however far;
 * 3. the geo adapter's answer as free text, when the city's catalog has no points;
 * 4. `null`.
 *
 * The catalog wins whenever it can answer, for the reason it wins in
 * `locateAddress`: a node is a fact an operator entered, and delivery prices it
 * without asking a geocoder again.
 */
export async function addressByCoordinate(
  geo: GeoAdapter,
  coordinate: AddressPoint,
  city: string,
): Promise<OrderAddress | null> {
  let reversed: GeoAddress | null = null;
  try {
    reversed = await geo.reverse(coordinate);
  } catch (error) {
    // A geocoder that is down leaves the catalog, which still has an answer.
    sails.log.warn("CORE > addressByCoordinate > reverse geocoding failed", error);
  }

  // The whole city in one read. Matching needs the geocoder's words to contain
  // the catalog's, which no criteria expresses, and the nearest point needs
  // every point anyway.
  const nodes: AddressRecord[] = await Address.find!({ city });

  const matched = reversed ? matchCatalog(nodes, reversed) : null;
  if (matched) return await catalogAnswer(matched.node, matched.home, coordinate);

  const nearest = nearestWithPoint(nodes, coordinate);
  if (nearest) return await catalogAnswer(nearest, undefined, coordinate);

  if (reversed) {
    // Free text travels as a line and a house number, the way the storefront
    // sends an address typed without choosing from the list.
    return {
      node: null,
      formatted: reversed.street ?? reversed.formatted,
      home: reversed.home,
      coordinate,
    };
  }

  return null;
}

/** What a geocoder's street can be in the catalog. */
const STREET_TYPES = ["street", "alley"];

/** "улица 8 Марта" → ["улица", "8", "марта"]. */
function words(text: string | undefined | null): string[] {
  return (text ?? "").toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
}

function parentOf(node: AddressRecord): string | null {
  return typeof node.parent === "string" ? node.parent : node.parent?.id ?? null;
}

/**
 * The catalog node for what the geocoder said, or `null` when the catalog does
 * not know the street or the geocoder named no house.
 *
 * A catalog street matches when every word of its name, or of one of its
 * aliases, is in the geocoder's street: "Малышева" is "улица Малышева",
 * "Ленина" is "проспект Ленина". Under it, a house by its exact name wins, then
 * a range that covers the number; with neither, the street itself carries the
 * number, as if the customer had typed it.
 */
function matchCatalog(nodes: AddressRecord[], reversed: GeoAddress): { node: AddressRecord; home?: string } | null {
  const home = reversed.home?.trim();
  if (!reversed.street || !home) return null;

  const said = new Set(words(reversed.street));
  const streets = nodes.filter(
    (node) =>
      STREET_TYPES.includes(node.type) &&
      [node.name, ...(node.names ?? [])].some((name) => {
        const own = words(name);
        return own.length > 0 && own.every((word) => said.has(word));
      }),
  );
  if (!streets.length) return null;

  const under = (street: AddressRecord) => nodes.filter((node) => parentOf(node) === street.id);
  const sameHouse = (name: string) => name.replace(/\s+/g, "").toLowerCase() === home.replace(/\s+/g, "").toLowerCase();

  for (const street of streets) {
    const house = under(street).find((node) => node.type === "house" && sameHouse(node.name));
    if (house) return { node: house };
  }

  const number = leadingNumber(home);
  if (number !== null) {
    for (const street of streets) {
      const range = under(street).find((node) => node.type === "range" && rangeCovers(node, number));
      if (range) return { node: range, home };
    }
  }

  return { node: streets[0], home };
}

function nearestWithPoint(nodes: AddressRecord[], coordinate: AddressPoint): AddressRecord | null {
  let nearest: AddressRecord | null = null;
  let nearestKm = Infinity;

  for (const node of nodes) {
    if (!isValidCoordinate(node.point)) continue;
    const km = distanceKm(coordinate, node.point);
    if (km < nearestKm) {
      nearest = node;
      nearestKm = km;
    }
  }

  return nearest;
}

/** A node as an order carries it: its path as the line, its point when it has one. */
async function catalogAnswer(node: AddressRecord, home: string | undefined, requested: AddressPoint): Promise<OrderAddress> {
  return {
    node: node.id,
    formatted: formatAddressLine(await Address.path(node.id), home),
    home,
    coordinate: isValidCoordinate(node.point) ? node.point : requested,
  };
}
