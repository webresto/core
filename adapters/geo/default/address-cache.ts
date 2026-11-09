import { AddressPoint, GeocodedHouse } from "../../../interfaces/Geo";
import type { AddressRecord } from "../../../models/Address";
import { isValidCoordinate } from "../../../lib/address/coordinate";
import { distanceKm } from "../../../lib/geo/utils";
import { toId } from "../../../lib/association-id";

/**
 * The houses geocoders found, kept in the catalog the way its own nodes are, so a suggestion shows
 * them the same way: a cached house hangs under our street of its name, or under a cached street
 * when the catalog has none. The mark is `Address.cache`; an upload deletes only our nodes and
 * `relinkCache` hangs the cached houses under the streets it brought.
 */

/** Closer than this, a point is at a node: a click lands on the house, a found house is one known already. */
export const SNAP_METERS = 10;

/** The nodes that are a place to knock at, and so a place a click can land on. */
const PLACE_TYPES = ["house", "building", "entrance", "unit", "place"];

const STREET_TYPES = ["street", "alley"];

/** Lower-cased letter and digit runs: "Word 8 Word" → ["word", "8", "word"]. */
function words(text: string | undefined | null): string[] {
  return (text ?? "").toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
}

const sameWords = (a: string, b: string) => {
  const one = new Set(words(a));
  const two = new Set(words(b));
  return one.size > 0 && one.size === two.size && [...one].every((word) => two.has(word));
};

/** "12 A" is "12a": a house number is compared without spaces and case. */
export const sameHouse = (a: string, b: string) => a.replace(/\s+/g, "").toLowerCase() === b.replace(/\s+/g, "").toLowerCase();

const parentOf = (node: AddressRecord): string | null => toId(node.parent) ?? null;

/** The place to knock at nearest to a point and closer than `SNAP_METERS`. */
export function placeAt(nodes: AddressRecord[], point: AddressPoint): AddressRecord | null {
  let nearest: AddressRecord | null = null;
  let nearestMeters = SNAP_METERS;
  for (const node of nodes) {
    if (!PLACE_TYPES.includes(node.type) || !isValidCoordinate(node.point)) continue;
    const meters = distanceKm(point, node.point) * 1000;
    if (meters <= nearestMeters) {
      nearest = node;
      nearestMeters = meters;
    }
  }
  return nearest;
}

const namesOf = (street: AddressRecord) => [street.name, ...(street.names ?? [])];

/**
 * Our street a street line names, or `null` when none does or more than one could.
 *
 * The same words both ways first, so "Lenina lane" is our "Lenina lane" and not our "Lenina". Then
 * the one street whose every word is in the line — our "Lenina" in "Lenina street" — but only when
 * it is the only one: with two, the house would hang under a street picked at random, and the
 * order would carry the wrong line to the courier. Under a cached street it is at least not wrong.
 *
 * Two streets of one name — the city's own and one of a village inside it — are not two guesses:
 * the house at `point` is on the one whose houses are nearer.
 */
export function ourStreet(nodes: AddressRecord[], line: string, point?: AddressPoint | null): AddressRecord | null {
  const streets = nodes.filter((node) => !node.cache && STREET_TYPES.includes(node.type));
  const said = new Set(words(line));

  const equal = streets.filter((street) => namesOf(street).some((name) => sameWords(name, line)));
  if (equal.length) return equal.length === 1 ? equal[0] : nearestStreet(nodes, equal, point);

  const within = streets.filter((street) =>
    namesOf(street).some((name) => {
      const own = words(name);
      return own.length > 0 && own.every((word) => said.has(word));
    }),
  );
  if (within.length === 1) return within[0];
  const namesakes = within.every((street) => namesOf(street).some((name) => namesOf(within[0]).some((first) => sameWords(name, first))));
  return within.length && namesakes ? nearestStreet(nodes, within, point) : null;
}

/** Of streets of one name, the one with a house nearest to the point; `null` without a point or houses to measure by. */
function nearestStreet(nodes: AddressRecord[], streets: AddressRecord[], point?: AddressPoint | null): AddressRecord | null {
  if (!isValidCoordinate(point)) return null;
  let nearest: AddressRecord | null = null;
  let nearestKm = Infinity;
  for (const node of nodes) {
    if (!isValidCoordinate(node.point)) continue;
    const street = streets.find((one) => one.id === parentOf(node));
    if (!street) continue;
    const km = distanceKm(point, node.point);
    if (km < nearestKm) {
      nearest = street;
      nearestKm = km;
    }
  }
  return nearest;
}

/** The street of a geocoder's line and the point of its house: ours of that name (the nearer of two), else a cached one; `null` - none yet. */
export function streetOf(nodes: AddressRecord[], line: string, point: AddressPoint | null | undefined): AddressRecord | null {
  return ourStreet(nodes, line, point) ?? nodes.find((node) => node.cache && STREET_TYPES.includes(node.type) && sameWords(node.name, line)) ?? null;
}

/** The street a cached house hangs under: `streetOf`, or a cached one made when there is none. */
async function streetFor(city: string, nodes: AddressRecord[], line: string, source: string, point: AddressPoint | null | undefined): Promise<AddressRecord> {
  const known = streetOf(nodes, line, point);
  if (known) return known;
  const street = await createOrTwin({ city, parent: null, type: "street", name: line, cache: { source, street: line } });
  nodes.push(street);
  return street;
}

/**
 * A row, or the twin that got there first: two visitors clicking one house at once both find it
 * missing, and the second create is refused by the model's twin rule. Refused for another reason,
 * the error stands.
 */
async function createOrTwin(values: Partial<AddressRecord>): Promise<AddressRecord> {
  try {
    return await Address.create!(values as AddressRecord).fetch();
  } catch (error) {
    const twin = await Address.findOne!({ city: values.city, parent: values.parent ?? null, type: values.type, name: values.name });
    if (twin) return twin;
    throw error;
  }
}

/**
 * The catalog node of a house a geocoder found: one known already — closer than `SNAP_METERS`, or
 * of that number under its street — or a new cached one.
 *
 * `under` - the street a customer chose and typed the number under: the house goes there, and only
 * that number there is known already. The place closer than 10 m is not asked: a corner house has an
 * address on each street, the catalog knows one of them, and the typed one is the one wanted.
 */
export async function cacheHouse(city: string, house: GeocodedHouse, source: string, under?: AddressRecord): Promise<AddressRecord> {
  const nodes: AddressRecord[] = await Address.find!({ city });

  if (!under) {
    const known = placeAt(nodes, house.point);
    if (known) return known;
  }

  const street = under ?? (await streetFor(city, nodes, house.street, source, house.point));
  const twin = nodes.find((node) => parentOf(node) === street.id && node.type === "house" && sameHouse(node.name, house.home));
  if (twin) return twin;

  return await createOrTwin({ city, parent: street.id, type: "house", name: house.home, point: house.point, cache: { source, street: house.street } });
}

/**
 * The house of a street line and a number among what the catalog knows, ours or cached: what a
 * typed address is looked up by before a geocoder is paid for it.
 */
export function knownHouse(nodes: AddressRecord[], line: string, home: string): AddressRecord | null {
  const ours = ourStreet(nodes, line);
  const streets = ours ? [ours] : nodes.filter((node) => node.cache && STREET_TYPES.includes(node.type) && sameWords(node.name, line));
  for (const street of streets) {
    const house = nodes.find((node) => parentOf(node) === street.id && node.type === "house" && sameHouse(node.name, home));
    if (house) return house;
  }
  return null;
}

/**
 * After an upload, the cached houses of the city hang under its streets again.
 *
 * A replace deleted our streets, so a cached house may hang from nothing; an upload without replace
 * may have brought our street for a cached one. Either way the house goes under our street of its
 * `cache.street`, and with none, under a cached street of that name. A cached house that is ours
 * now — closer than `SNAP_METERS` to one of our places, or of that number under our street — is
 * deleted: the catalog is the answer. So is a cached street left without houses.
 */
export async function relinkCache(city: string): Promise<void> {
  const nodes: AddressRecord[] = await Address.find!({ city });
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const ours = nodes.filter((node) => !node.cache);
  const drop = (node: AddressRecord) => {
    byId.delete(node.id);
    return Address.destroy!({ id: node.id });
  };

  for (const house of nodes.filter((node) => node.cache && node.type === "house")) {
    if (isValidCoordinate(house.point) && placeAt(ours, house.point)) {
      await drop(house);
      continue;
    }

    const parent = byId.get(parentOf(house) ?? "");
    if (parent && !parent.cache) continue;

    const street = ourStreet(ours, house.cache!.street, house.point) ?? (parent || (await streetFor(city, nodes, house.cache!.street, house.cache!.source, house.point)));
    if (street.id === parent?.id) continue;
    byId.set(street.id, street);

    if (!street.cache && ours.some((node) => parentOf(node) === street.id && node.type === "house" && sameHouse(node.name, house.name))) {
      await drop(house);
      continue;
    }
    // The whole identity goes with the new parent: `beforeUpdate` sees only these values, and
    // without them it could not tell a move onto a neighbour of the same number.
    await Address.update!({ id: house.id }, { id: house.id, city, parent: street.id, type: house.type, name: house.name });
    house.parent = street.id;
  }

  const hanging = new Set([...byId.values()].map(parentOf));
  for (const street of nodes.filter((node) => node.cache && STREET_TYPES.includes(node.type))) {
    if (byId.has(street.id) && !hanging.has(street.id)) await drop(street);
  }
}
