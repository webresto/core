import OrderAddress from "../interfaces/Address";
import {
  DeliveryCapabilityError,
  DeliveryCoordinate,
  DeliveryLocationError,
  DeliveryLocationSearchResult,
  ResolvedDeliveryLocation,
} from "../adapters/delivery/contracts";
import DeliveryAdapter from "../adapters/delivery/DeliveryAdapter";
import { LEAF_WITH_POINT, formatAddressPath } from "./address";

/**
 * Turning an address into a coordinate.
 *
 * This stays in core rather than moving to the default adapter with the zone
 * machinery, and the reason is the same one it was written for: the order of the
 * steps is a safety property, not an implementation detail. An adapter that
 * reordered them could geocode the string "Lenin Monument" and deliver an order
 * to whatever the geocoder happened to return.
 *
 * Nothing here knows what a zone is. `kitchen-assignment` needs a coordinate for
 * an address whatever adapter is in use, so this is the half of the old
 * `delivery-zone-calculation` that is common to all of them.
 */

/** A geocoder call an adapter supplies. Returns `null` when nothing matched. */
export type AddressGeocoder = (parts: {
  street: string;
  home: string;
  city?: string;
}) => Promise<DeliveryCoordinate | null>;

export function isValidCoordinate(value: unknown): value is DeliveryCoordinate {
  if (!value || typeof value !== "object") return false;
  const coordinate = value as Partial<DeliveryCoordinate>;
  return (
    typeof coordinate.lat === "number" &&
    Number.isFinite(coordinate.lat) &&
    coordinate.lat >= -90 &&
    coordinate.lat <= 90 &&
    typeof coordinate.lng === "number" &&
    Number.isFinite(coordinate.lng) &&
    coordinate.lng >= -180 &&
    coordinate.lng <= 180
  );
}

function trimmed(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}

/**
 * Resolves a selection to a coordinate, in this order:
 *
 * 1. a valid coordinate supplied by the client;
 * 2. the organization's own coordinate;
 * 3. geocoding of street **and** house number together;
 * 4. `DELIVERY_LOCATION_UNRESOLVABLE`.
 *
 * Step four never falls back to geocoding a label. A landmark whose stored
 * address is broken has to be fixed, not guessed at: guessing quietly assigns
 * the delivery to some other place with a similar name.
 */
export async function resolveSelectedLocation(
  selected: DeliveryLocationSearchResult,
  options: {
    suppliedCoordinate?: DeliveryCoordinate;
    geocode?: AddressGeocoder;
  } = {},
): Promise<ResolvedDeliveryLocation> {
  const diagnostics: string[] = [];
  const street = trimmed(selected.street);
  const home = trimmed(selected.home);
  const streetId = trimmed(selected.streetId);
  // The customer's city, and only theirs. Qualifying "Republic street" with an
  // installation-wide city is what sends it to the wrong town.
  const city = trimmed(selected.city);

  if (options.suppliedCoordinate !== undefined) {
    if (isValidCoordinate(options.suppliedCoordinate)) {
      return {
        coordinate: options.suppliedCoordinate,
        streetId,
        street,
        home,
        source: "client-coordinate",
        diagnostics,
      };
    }
    diagnostics.push("supplied coordinate is invalid and was ignored");
  }

  if (selected.coordinate !== undefined) {
    if (isValidCoordinate(selected.coordinate)) {
      return {
        coordinate: selected.coordinate,
        streetId,
        street,
        home,
        source: "organization-coordinate",
        diagnostics,
      };
    }
    diagnostics.push("selected location carries an invalid coordinate");
  }

  // Both parts, or nothing. A street without a house number points at a line on
  // the map, and a house number without a street is meaningless.
  if (street && home) {
    if (!options.geocode) {
      diagnostics.push("no geocoder is configured for this adapter");
      throw new DeliveryLocationError(
        "DELIVERY_LOCATION_UNRESOLVABLE",
        "Address cannot be resolved without a geocoder",
        diagnostics,
      );
    }

    let geocoded: DeliveryCoordinate | null;
    try {
      geocoded = await options.geocode({ street, home, city });
    } catch (error) {
      diagnostics.push(`geocoder failed: ${error instanceof Error ? error.message : String(error)}`);
      throw new DeliveryLocationError(
        "DELIVERY_LOCATION_GEOCODER_FAILED",
        "Geocoder request failed",
        diagnostics,
      );
    }

    if (geocoded && isValidCoordinate(geocoded)) {
      diagnostics.push(`geocoder placed "${street} ${home}"${city ? ` (${city})` : ""} at ${geocoded.lat}, ${geocoded.lng}`);
      return {
        coordinate: geocoded,
        streetId,
        street,
        home,
        source: "geocoded-address",
        diagnostics,
      };
    }

    diagnostics.push(`geocoder found nothing for "${street} ${home}"`);
    throw new DeliveryLocationError(
      "DELIVERY_LOCATION_UNRESOLVABLE",
      "Coordinates not found for the given address",
      diagnostics,
    );
  }

  diagnostics.push(
    selected.kind === "organization"
      ? `organization "${selected.label}" has neither a coordinate nor a street and house number`
      : `address selection has no street and house number`,
  );
  // Deliberately not geocoding `selected.label` here.
  throw new DeliveryLocationError(
    "DELIVERY_LOCATION_UNRESOLVABLE",
    "Selected location cannot be resolved to a coordinate",
    diagnostics,
  );
}


/** The coordinate the client sent with the address, when it is a usable one. */
export function coordinateFromAddress(address: OrderAddress | null | undefined): DeliveryCoordinate | null {
  const coordinate = address?.coordinate;
  return isValidCoordinate(coordinate) ? coordinate : null;
}

/** Where an address turned out to be, and whether the attempt failed outright. */
export interface AddressLocation {
  coordinate: DeliveryCoordinate | null;
  /** Set when the adapter tried to resolve the address and could not. */
  unrecognized: boolean;
  diagnostics: string[];
}

/**
 * Finds the coordinate of an address, in this order:
 *
 * 1. the coordinate the address already carries;
 * 2. the `point` of the catalog node the customer chose;
 * 3. the geocoder, on the node's path plus the house number.
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
  adapter: DeliveryAdapter,
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

  if (chosen && isValidCoordinate(chosen.point)) {
    diagnostics.push(`address point source: address-node (${chosen.type} "${chosen.name}")`);
    return { coordinate: chosen.point, unrecognized: false, diagnostics };
  }

  // The words to geocode. With a node they are its path — a leaf carries the
  // house number in its own name, so it becomes `home` and leaves the street
  // behind it. Without a node the customer typed the line themselves.
  const names = path.map((step) => step.name);
  let home = trimmed(address?.home);
  if (!home && chosen && LEAF_WITH_POINT.includes(chosen.type)) {
    home = names.pop();
  }
  const street = names.length ? formatAddressPath(names) : trimmed(address?.formatted);

  if (!street || !home) {
    diagnostics.push("address has no coordinate, no node with a point and no street with a house number");
    return { coordinate: null, unrecognized: false, diagnostics };
  }

  try {
    const resolved = await adapter.resolveDeliveryLocation({
      id: node ?? formatAddressPath([street, home]),
      kind: "street",
      label: formatAddressPath([street, home]),
      street,
      home,
      city: trimmed(address?.city),
    });
    diagnostics.push(...(resolved.diagnostics ?? []), "address point source: geocoder");
    return { coordinate: resolved.coordinate, unrecognized: false, diagnostics };
  } catch (error) {
    if (error instanceof DeliveryCapabilityError) {
      // The adapter does not geocode at all. A configuration state, not a
      // failed delivery.
      diagnostics.push("delivery adapter cannot resolve addresses to coordinates");
      return { coordinate: null, unrecognized: false, diagnostics };
    }

    if (error instanceof DeliveryLocationError) {
      diagnostics.push(...error.diagnostics, error.code);
      return { coordinate: null, unrecognized: true, diagnostics };
    }

    throw error;
  }
}
