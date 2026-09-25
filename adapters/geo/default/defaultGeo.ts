import axios from "axios";
import GeoAdapter from "../GeoAdapter";
import OrderAddress from "../../../interfaces/OrderAddress";
import { AddressDescription, AddressLocation, AddressNode, AddressPoint, GeoAddress } from "../../../interfaces/Geo";
import type { AddressRecord } from "../../../models/Address";
import { formatAddressLine, formatAddressPath } from "../../../lib/address/format";
import { leadingNumber, rangeCovers } from "../../../lib/address/range";
import { coordinateFromAddress, isValidCoordinate } from "../../../lib/address/coordinate";
import { distanceKm } from "../../../lib/geo/utils";

/**
 * The node types of an address graph.
 *
 * Addresses live in one flat table: every node knows its city and its parent,
 * and what may follow a node is answered by its children, not by a description
 * of the city's structure. These lists are the only thing that is decided in
 * code, and they are decided per type rather than per city — one city has
 * `street` and `quarter` children at once, in another a `commune` has `alley`
 * children, and neither needs a different answer for what a `house` is.
 *
 * They describe `Address`, so they belong to this adapter and to that model. An
 * installation that needs its own node types needs its own catalog, which is
 * its own geo adapter.
 */
export const ADDRESS_TYPES: readonly string[] = ["district", "quarter", "ward", "commune", "street", "alley", "house", "building", "entrance", "unit", "range", "place"];

/**
 * Found by a search that starts at the city.
 *
 * `house`, `building`, `entrance` and `unit` are missing on purpose: typing "10"
 * with nothing chosen yet would otherwise offer every house number in the city.
 * A node the city holds directly is found at the root whatever its type — that
 * is a different rule, and it lives in `Address.search`.
 */
export const ROOT_SEARCHABLE: readonly string[] = ["district", "quarter", "ward", "commune", "street", "alley", "place"];

/** Leaves that carry their own coordinate, so the geocoder is never asked. */
export const LEAF_WITH_POINT: readonly string[] = ["house", "entrance", "unit", "place"];

/**
 * Nodes that are the place to knock at all by themselves.
 *
 * Choosing one of these answers the question a house number asks, so checkout
 * stops asking it and `formatted` does not repeat it. A street or a quarter does
 * not: `building` and `entrance` are here because they only ever hang under a
 * house, which is already in the path. `range` is deliberately not — a range of
 * house numbers is the one node that exists to have a number typed after it.
 */
export const SELF_ADDRESSED: readonly string[] = ["house", "building", "entrance", "unit", "place"];

/** How many suggestions one query returns. */
export const ADDRESS_SEARCH_LIMIT = 20;

/** What a geocoder's street can be in the catalog. */
const STREET_TYPES = ["street", "alley"];

/**
 * The geo adapter core ships: the `Address` catalog, with Nominatim for what
 * the catalog does not know.
 *
 * `NOMINATIM_URL` says which server; the public one when it is unset.
 */
export class DefaultGeoAdapter extends GeoAdapter {
  /**
   * Finds the coordinate of an address, in this order:
   *
   * 1. the coordinate the address already carries;
   * 2. the `point` of the catalog node the customer chose, or of the nearest node
   *    above it that has one;
   * 3. the geocoder, on the node's path plus the house number.
   *
   * The point is inherited because that is what the graph already says: a table on
   * a food court, a cabin in a hotel, a doorway of a house are all at the place
   * they hang from. Making every one of them carry a copy of its parent's
   * coordinate would be the same fact written twice, and the second copy is the
   * one that goes stale.
   *
   * The catalog comes before the geocoder because it is the only one of the three
   * that gives the same answer twice. A house entered in the catalog is a fact an
   * operator put there; a geocoder's answer for the same words is a guess that can
   * change between two recounts of one basket.
   *
   * The last step is skipped unless both halves are known. A street without a
   * house number points at a line on the map, and a house number without a street
   * is meaningless — geocoding either one puts the order somewhere plausible and
   * wrong.
   */
  public async locate(address: OrderAddress | undefined | null): Promise<AddressLocation> {
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

    let geocoded: AddressPoint | null;
    try {
      geocoded = await this.geocode({ street, home, city });
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

  /**
   * The address a customer is standing at. In this order:
   *
   * 1. the reverse geocoder, matched against the city's catalog: the street by
   *    its words, then the house by its number;
   * 2. the nearest catalog node with a point, however far;
   * 3. the reverse geocoder as free text, when the city's catalog has no points;
   * 4. `null`.
   *
   * The catalog wins whenever it can answer, for the reason it wins in `locate`:
   * a node is a fact an operator entered, and delivery prices it without asking a
   * geocoder again.
   */
  public async addressByCoordinate(coordinate: AddressPoint, city: string): Promise<OrderAddress | null> {
    let reversed: GeoAddress | null = null;
    try {
      reversed = await this.reverse(coordinate);
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

  /**
   * Each suggestion carries the names above it, so two streets called "Ленина"
   * can be told apart in the list.
   *
   * Read per suggestion rather than stored on the row: there are at most twenty of
   * them and the graph is shallow, which is cheaper than an `ancestors` column
   * that has to be rewritten every time a district is renamed. The path of one
   * parent serves every child in the list, so it is read once.
   */
  public async search(params: { city: string; parent?: string | null; query: string }): Promise<AddressNode[]> {
    const found = await Address.search(params);
    const paths = new Map<string, string[]>();

    return await Promise.all(
      found.map(async (node) => {
        const parent = parentOf(node);
        if (!parent) return asNode(node, []);

        let names = paths.get(parent);
        if (!names) {
          names = (await Address.path(parent)).map((step) => step.name);
          paths.set(parent, names);
        }
        return asNode(node, names);
      }),
    );
  }

  /** The path is its own answer here: everything before a node is above it. */
  public async path(id: string): Promise<AddressNode[]> {
    const path = await Address.path(id);
    return path.map((node, at) => asNode(node, path.slice(0, at).map((step) => step.name)));
  }

  /**
   * Rebuilt from the catalog rather than trusted from the client: the node is
   * the fact, the string is a rendering of it. Free text is kept as typed —
   * there is no path to rebuild it from.
   */
  public async describe(address: OrderAddress): Promise<AddressDescription> {
    if (!address.node) return { formatted: address.formatted, selfAddressed: false };

    const path = await Address.path(address.node);
    const leaf = path[path.length - 1];
    return {
      formatted: formatAddressLine(path, address.home, SELF_ADDRESSED),
      selfAddressed: Boolean(leaf && SELF_ADDRESSED.includes(leaf.type)),
    };
  }

  /**
   * The coordinate of a street and house number. `null` when nothing matched; a
   * request that failed throws.
   *
   * The parts come separately rather than as one string so a caller cannot pass
   * an organization name here by accident.
   */
  protected async geocode(parts: { street: string; home: string; city?: string }): Promise<AddressPoint | null> {
    const query = [parts.city, parts.street, parts.home].filter(Boolean).join(", ");
    const results = await nominatim("search", { q: query, limit: 1 });
    return Array.isArray(results) ? pointOf(results[0]) : null;
  }

  /**
   * The building at a coordinate, or the nearest thing Nominatim has.
   *
   * The city is read off the answer, not assumed: a point on a city's edge can
   * belong to the next municipality.
   */
  protected async reverse(coordinate: AddressPoint): Promise<GeoAddress | null> {
    // Zoom 18 is the building level: coarser answers stop at the street and
    // carry no house number.
    const result = (await nominatim("reverse", { lat: coordinate.lat, lon: coordinate.lon, zoom: 18 })) as NominatimResult | null;
    if (!result || result.error) return null;

    const address = result.address ?? {};
    const street = address.road ?? address.pedestrian ?? address.footway ?? undefined;
    const home = address.house_number ?? undefined;
    const city = address.city ?? address.town ?? address.village ?? address.municipality ?? undefined;
    // "улица Ленина, 12" rather than the whole display name down to the
    // postcode and the country.
    const formatted = street ? formatAddressPath([street, home]) : result.display_name;
    if (!formatted) return null;

    return { city, street, home, formatted };
  }
}

/** A catalog row as the storefront reads it: the parent is an id, never an object. */
function asNode(node: AddressRecord, ancestors: string[]): AddressNode {
  return {
    id: node.id,
    type: node.type,
    name: node.name,
    parent: parentOf(node),
    point: node.point,
    ancestors,
  };
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

/** A node as an order carries it: its path as the line, its point when it has one. */
async function catalogAnswer(node: AddressRecord, home: string | undefined, requested: AddressPoint): Promise<OrderAddress> {
  return {
    node: node.id,
    formatted: formatAddressLine(await Address.path(node.id), home, SELF_ADDRESSED),
    home,
    coordinate: isValidCoordinate(node.point) ? node.point : requested,
  };
}

function trimmed(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}

/** "улица 8 Марта" → ["улица", "8", "марта"]. */
function words(text: string | undefined | null): string[] {
  return (text ?? "").toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
}

function parentOf(node: AddressRecord): string | null {
  return typeof node.parent === "string" ? node.parent : node.parent?.id ?? null;
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

interface NominatimResult {
  lat?: string;
  lon?: string;
  display_name?: string;
  address?: Record<string, string>;
  /** Set instead of everything else when `/reverse` finds nothing. */
  error?: string;
}

const DEFAULT_BASE_URL = "https://nominatim.openstreetmap.org";
const DEFAULT_TIMEOUT_MS = 10000;

async function nominatimBaseUrl(): Promise<string> {
  const configured = await Settings.get("NOMINATIM_URL");
  const url = typeof configured === "string" && configured.trim() ? configured.trim() : DEFAULT_BASE_URL;
  return url.replace(/\/+$/, "");
}

async function nominatim(path: string, params: Record<string, string | number>): Promise<unknown> {
  const base = await nominatimBaseUrl();
  const search = new URLSearchParams({ format: "json", addressdetails: "1", ...params } as any);

  const response = await axios.get(`${base}/${path}?${search.toString()}`, {
    timeout: DEFAULT_TIMEOUT_MS,
    headers: {
      // Nominatim's usage policy requires an identifying User-Agent.
      "User-Agent": `webresto-core/${process.env.npm_package_version ?? "1.0"}`,
      "Accept-Language": (await Settings.get("DEFAULT_LOCALE")) || "en",
    },
  });

  return response.data;
}

function pointOf(result: NominatimResult | undefined): AddressPoint | null {
  if (!result?.lat || !result?.lon) return null;

  const lat = parseFloat(result.lat);
  const lon = parseFloat(result.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  return { lat, lon };
}
