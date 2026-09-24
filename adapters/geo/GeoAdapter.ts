import OrderAddress from "../../interfaces/OrderAddress";
import { AddressLocation, AddressPoint, GeoAddress } from "../../interfaces/Geo";
import type { AddressRecord } from "../../models/Address";
import { formatAddressLine, formatAddressPath } from "../../lib/address/format";
import { leadingNumber, rangeCovers } from "../../lib/address/range";
import { coordinateFromAddress, isValidCoordinate } from "../../lib/address/coordinate";
import { distanceKm } from "../delivery/geo";

/**
 * Where an address is, and what address is at a point.
 *
 * One adapter serves an installation, chosen by `GEO_ADAPTER`. Delivery asks it
 * for the coordinate of an address with `locate`; the storefront asks it, through
 * `addressByCoordinate`, which address the customer is standing at.
 *
 * Only `geocode` is left to an implementation. The rules of the address catalog
 * and both lookups are here, so any geocoder gets them as they are; one that
 * needs its own node type overrides a list or extends it:
 * `get addressTypes() { return [...super.addressTypes, "pier"]; }`. The lists
 * are getters because `super` does not reach a class field.
 */
export default abstract class GeoAdapter {
  /**
   * The node types of an address graph.
   *
   * Addresses live in one flat table: every node knows its city and its parent,
   * and what may follow a node is answered by its children, not by a description
   * of the city's structure. These lists are the only thing that is decided in
   * code, and they are decided per type rather than per city — one city has
   * `street` and `quarter` children at once, in another a `commune` has `alley`
   * children, and neither needs a different answer for what a `house` is.
   */
  public get addressTypes(): readonly string[] {
    return ["district", "quarter", "ward", "commune", "street", "alley", "house", "building", "entrance", "unit", "range", "place"];
  }

  /**
   * Found by a search that starts at the city.
   *
   * `house`, `building`, `entrance` and `unit` are missing on purpose: typing "10"
   * with nothing chosen yet would otherwise offer every house number in the city.
   * A node the city holds directly is found at the root whatever its type — that
   * is a different rule, and it lives in `Address.search`.
   */
  public get rootSearchable(): readonly string[] {
    return ["district", "quarter", "ward", "commune", "street", "alley", "place"];
  }

  /** Leaves that carry their own coordinate, so the geocoder is never asked. */
  public get leafWithPoint(): readonly string[] {
    return ["house", "entrance", "unit", "place"];
  }

  /**
   * Nodes that are the place to knock at all by themselves.
   *
   * Choosing one of these answers the question a house number asks, so checkout
   * stops asking it and `formatted` does not repeat it. A street or a quarter does
   * not: `building` and `entrance` are here because they only ever hang under a
   * house, which is already in the path. `range` is deliberately not — a range of
   * house numbers is the one node that exists to have a number typed after it.
   */
  public get selfAddressed(): readonly string[] {
    return ["house", "building", "entrance", "unit", "place"];
  }

  /** How many suggestions one query returns. */
  public get addressSearchLimit(): number {
    return 20;
  }

  /**
   * The coordinate of a street and house number. `null` when nothing matched; a
   * request that failed throws.
   *
   * The parts come separately rather than as one string so a caller cannot pass
   * an organization name here by accident.
   */
  public abstract geocode(parts: { street: string; home: string; city?: string }): Promise<AddressPoint | null>;

  /**
   * The address at a coordinate. A geocoder without a reverse lookup is a valid
   * adapter: `null` leaves `addressByCoordinate` with the catalog alone.
   */
  public async reverse(coordinate: AddressPoint): Promise<GeoAddress | null> {
    return null;
  }

  /**
   * Finds the coordinate of an address, in this order:
   *
   * 1. the coordinate the address already carries;
   * 2. the `point` of the catalog node the customer chose, or of the nearest node
   *    above it that has one;
   * 3. `geocode`, on the node's path plus the house number.
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
    if (!home && chosen && this.leafWithPoint.includes(chosen.type)) {
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
   * The address a customer is standing at, for the storefront's "detect my
   * location". In this order:
   *
   * 1. `reverse`, matched against the city's catalog: the street by its words,
   *    then the house by its number;
   * 2. the nearest catalog node with a point, however far;
   * 3. `reverse` as free text, when the city's catalog has no points;
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

    const matched = reversed ? this.matchCatalog(nodes, reversed) : null;
    if (matched) return await this.catalogAnswer(matched.node, matched.home, coordinate);

    const nearest = nearestWithPoint(nodes, coordinate);
    if (nearest) return await this.catalogAnswer(nearest, undefined, coordinate);

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
   * The catalog node for what the geocoder said, or `null` when the catalog does
   * not know the street or the geocoder named no house.
   *
   * A catalog street matches when every word of its name, or of one of its
   * aliases, is in the geocoder's street: "Малышева" is "улица Малышева",
   * "Ленина" is "проспект Ленина". Under it, a house by its exact name wins, then
   * a range that covers the number; with neither, the street itself carries the
   * number, as if the customer had typed it.
   */
  private matchCatalog(nodes: AddressRecord[], reversed: GeoAddress): { node: AddressRecord; home?: string } | null {
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
  private async catalogAnswer(node: AddressRecord, home: string | undefined, requested: AddressPoint): Promise<OrderAddress> {
    return {
      node: node.id,
      formatted: formatAddressLine(await Address.path(node.id), home, this.selfAddressed),
      home,
      coordinate: isValidCoordinate(node.point) ? node.point : requested,
    };
  }
}

/** What a geocoder's street can be in the catalog. */
const STREET_TYPES = ["street", "alley"];

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
