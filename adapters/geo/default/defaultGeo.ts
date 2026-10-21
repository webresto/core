import GeoAdapter from "../GeoAdapter";
import OrderAddress from "../../../interfaces/OrderAddress";
import { AddressDescription, AddressLocation, AddressNode, AddressPoint, GeocodedHouse } from "../../../interfaces/Geo";
import type { AddressRecord } from "../../../models/Address";
import { formatAddressLine, formatAddressPath } from "../../../lib/address/format";
import { coordinateFromAddress, isValidCoordinate } from "../../../lib/address/coordinate";
import { findCityId } from "../../../lib/menu/cooking-place";
import { attachedGeocoders, isRecentMiss, rememberMiss } from "./geocoders";
import { cacheHouse, knownHouse, placeAt, sameHouse } from "./address-cache";

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

/** How far from a click a geocoder looks for a house when the catalog has none within `SNAP_METERS`. */
const AROUND_METERS = 100;

/**
 * The geo adapter core ships: the `Address` catalog, and the geocoders modules
 * attach (`registerGeocoder`) for what the catalog does not know.
 *
 * A house a geocoder finds is kept in the catalog as a cached node
 * (`address-cache.ts`), so the same question is not asked — and not paid for —
 * twice. With no geocoder attached the catalog is all there is, and an address
 * it does not know stays the text the customer typed.
 */
export class DefaultGeoAdapter extends GeoAdapter {
  /**
   * Finds the coordinate of an address, in this order:
   *
   * 1. the coordinate the address already carries;
   * 2. the `point` of the catalog node the customer chose, or of the nearest node
   *    above it that has one;
   * 3. the house of the street and number among the catalog's own and cached
   *    houses — under the chosen street, or under the street the text names;
   * 4. the geocoders, on the node's path plus the house number; a house found is
   *    cached.
   *
   * The point is inherited because that is what the graph already says: a table on
   * a food court, a cabin in a hotel, a doorway of a house are all at the place
   * they hang from. Making every one of them carry a copy of its parent's
   * coordinate would be the same fact written twice, and the second copy is the
   * one that goes stale.
   *
   * The catalog comes before the geocoders because it is the only one that gives
   * the same answer twice. A house entered in the catalog is a fact an operator
   * put there; a geocoder's answer for the same words is a guess that can change
   * between two recounts of one basket — and it costs money.
   *
   * The last two steps are skipped unless both halves are known. A street without
   * a house number points at a line on the map, and a house number without a
   * street is meaningless — geocoding either one puts the order somewhere
   * plausible and wrong.
   */
  public async locate(address: OrderAddress | undefined | null): Promise<AddressLocation> {
    const diagnostics: string[] = [];

    const supplied = coordinateFromAddress(address);
    if (supplied) {
      diagnostics.push("address point source: given");
      return { coordinate: supplied, diagnostics };
    }

    const node = trimmed(address?.node);
    const path = node ? await Address.path(node) : [];

    // From the chosen node upwards: the first ancestor with a point is where it
    // stands. A tent with its own coordinate answers for itself, a table on a
    // food court is at the mall.
    for (let step = path.length - 1; step >= 0; step--) {
      const above = path[step];
      if (isValidCoordinate(above.point)) {
        diagnostics.push(`address point source: address-node (${above.type} "${above.name}")`);
        return { coordinate: above.point, diagnostics };
      }
    }

    // The words to look up. With a node they are its path up to the house the
    // node stands in — the house carries its number in its own name, so it
    // becomes `home` and leaves the street behind it. What hangs below a house,
    // an entrance or a flat, is not on any map and drops out. So does a range: a
    // span of numbers, for which the number the customer typed stands in.
    let house = -1;
    for (let step = path.length - 1; step >= 0 && house < 0; step--) {
      if (path[step].type === "house" || path[step].type === "place") house = step;
    }
    const names = path
      .slice(0, house < 0 ? path.length : house + 1)
      .filter((step) => step.type !== "range")
      .map((step) => step.name);
    let home = trimmed(address?.home);
    if (!home && house >= 0) {
      home = names.pop();
    }
    const street = names.length ? formatAddressPath(names) : trimmed(address?.formatted);

    if (!street || !home) {
      diagnostics.push("address has no coordinate, no node with a point and no street with a house number");
      return { coordinate: null, diagnostics };
    }

    // The customer's city, and only theirs: its catalog, and its name for a
    // geocoder. Qualifying a street with an installation-wide city is what
    // sends it to the wrong town.
    const cityId = await findCityId(address?.city);

    if (cityId) {
      const nodes: AddressRecord[] = await Address.find!({ city: cityId });
      // A chosen street knows its houses by id; a typed one by its words.
      const chosen = path.length && house < 0 ? path[path.length - 1] : null;
      const known = chosen
        ? nodes.find((one) => toParent(one) === chosen.id && one.type === "house" && sameHouse(one.name, home!))
        : knownHouse(nodes, street, home);
      if (known && isValidCoordinate(known.point)) {
        diagnostics.push(`address point source: address-node (${known.type} "${known.name}"${known.cache ? `, cached from ${known.cache.source}` : ""})`);
        return { coordinate: known.point, diagnostics };
      }
    }

    const cityName = cityId ? (await City.findOne!({ id: cityId }))?.name : undefined;
    const miss = `house:${cityId ?? ""}:${street.toLowerCase()}:${home.toLowerCase()}`;
    if (isRecentMiss(miss)) {
      diagnostics.push(`geocoders found nothing for "${street} ${home}" a moment ago`);
      return { coordinate: null, diagnostics };
    }

    const asked = await askGeocoders((geocoder) => geocoder.house({ city: cityName ?? "", street, home }).then((found) => (found ? [found] : [])));
    diagnostics.push(...asked.diagnostics);
    if (!asked.house) {
      if (!asked.failed) rememberMiss(miss);
      diagnostics.push(`geocoders found nothing for "${street} ${home}"`);
      return { coordinate: null, diagnostics };
    }

    if (cityId) await cacheHouse(cityId, asked.house, asked.source);
    diagnostics.push(
      `${asked.source} placed "${street} ${home}"${cityName ? ` (${cityName})` : ""} at ${asked.house.point.lat}, ${asked.house.point.lon}`,
      "address point source: geocoder",
    );
    return { coordinate: asked.house.point, diagnostics };
  }

  /**
   * The address a customer clicked or is standing at. In this order:
   *
   * 1. a place of the catalog, ours or cached, closer than `SNAP_METERS`: the
   *    point lands on it;
   * 2. the house a geocoder finds nearest within `AROUND_METERS`, cached and
   *    landed on;
   * 3. `null`: the customer types the address.
   *
   * The catalog wins whenever it can answer, for the reason it wins in `locate`:
   * a node is a fact an operator entered, and delivery prices it without asking a
   * geocoder again.
   */
  public async addressByCoordinate(coordinate: AddressPoint, city: string): Promise<OrderAddress | null> {
    const nodes: AddressRecord[] = await Address.find!({ city });
    const near = placeAt(nodes, coordinate);
    if (near) return await catalogAnswer(near, coordinate);

    // A point is remembered to about ten meters: the same field clicked again.
    const miss = `around:${city}:${coordinate.lat.toFixed(4)}:${coordinate.lon.toFixed(4)}`;
    if (isRecentMiss(miss)) return null;

    const asked = await askGeocoders((geocoder) => geocoder.housesAround(coordinate, AROUND_METERS));
    if (!asked.house) {
      if (!asked.failed) rememberMiss(miss);
      return null;
    }
    return await catalogAnswer(await cacheHouse(city, asked.house, asked.source), coordinate);
  }

  /**
   * Each suggestion carries the names above it, so two streets with the same
   * name can be told apart in the list.
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
        const parent = toParent(node);
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
}

/**
 * The attached geocoders in their order, until one finds a house. `failed` —
 * every geocoder asked threw, so "nothing" is not an answer to remember.
 */
async function askGeocoders(
  ask: (geocoder: ReturnType<typeof attachedGeocoders>[number]) => Promise<GeocodedHouse[]>,
): Promise<{ house: GeocodedHouse | null; source: string; failed: boolean; diagnostics: string[] }> {
  const diagnostics: string[] = [];
  let answered = false;
  for (const geocoder of attachedGeocoders()) {
    try {
      const house = (await ask(geocoder)).find((one) => isValidCoordinate(one?.point) && trimmed(one.street) && trimmed(one.home));
      answered = true;
      if (house) return { house, source: geocoder.name, failed: false, diagnostics };
    } catch (error) {
      diagnostics.push(`geocoder ${geocoder.name} failed: ${error instanceof Error ? error.message : String(error)}`);
      sails.log.warn(`CORE > geocoder "${geocoder.name}" failed`, error);
    }
  }
  return { house: null, source: "", failed: !answered && attachedGeocoders().length > 0, diagnostics };
}

/** A catalog row as the storefront reads it: the parent is an id, never an object. */
function asNode(node: AddressRecord, ancestors: string[]): AddressNode {
  return {
    id: node.id,
    type: node.type,
    name: node.name,
    parent: toParent(node),
    point: node.point,
    ancestors,
  };
}

/** A node as an order carries it: its path as the line, its point when it has one. */
async function catalogAnswer(node: AddressRecord, requested: AddressPoint): Promise<OrderAddress> {
  return {
    node: node.id,
    formatted: formatAddressLine(await Address.path(node.id), undefined, SELF_ADDRESSED),
    home: undefined,
    coordinate: isValidCoordinate(node.point) ? node.point : requested,
  };
}

function trimmed(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}

function toParent(node: AddressRecord): string | null {
  return typeof node.parent === "string" ? node.parent : node.parent?.id ?? null;
}
