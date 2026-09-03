import Address from "../interfaces/Address";
import {
  DeliveryCapabilityError,
  DeliveryCoordinate,
  DeliveryLocationError,
  DeliveryLocationSearchResult,
  ResolvedDeliveryLocation,
} from "../adapters/delivery/contracts";
import DeliveryAdapter from "../adapters/delivery/DeliveryAdapter";

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

/** Reads `Address.coordinate`, whose parts are strings of unknown quality. */
export function coordinateFromAddress(address: {
  coordinate?: { lat?: string | number; lon?: string | number };
} | null | undefined): DeliveryCoordinate | null {
  const raw = address?.coordinate;
  if (!raw) return null;

  const lat = typeof raw.lat === "number" ? raw.lat : parseFloat(String(raw.lat));
  const lng = typeof raw.lon === "number" ? raw.lon : parseFloat(String(raw.lon));

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

  return { lat, lng };
}

/** Where an address turned out to be, and whether the attempt failed outright. */
export interface AddressLocation {
  coordinate: DeliveryCoordinate | null;
  /** Set when the adapter tried to resolve the address and could not. */
  unrecognized: boolean;
  diagnostics: string[];
}

/**
 * Finds the coordinate of an address.
 *
 * A coordinate already on the address is used as is. Otherwise the adapter is
 * asked to resolve the street and house number, but only if it implements
 * resolution at all: an adapter without a geocoder is not an error, it just
 * means there is no coordinate and callers fall back to what they did before.
 */
export async function locateAddress(
  adapter: DeliveryAdapter,
  address: Address | undefined | null,
): Promise<AddressLocation> {
  const diagnostics: string[] = [];

  const supplied = coordinateFromAddress(address);
  if (supplied) {
    return { coordinate: supplied, unrecognized: false, diagnostics };
  }

  if (!address?.street || !address?.home) {
    diagnostics.push("address has no coordinate and no street with house number");
    return { coordinate: null, unrecognized: false, diagnostics };
  }

  try {
    const resolved = await adapter.resolveDeliveryLocation({
      id: address.streetId ?? `${address.street} ${address.home}`,
      kind: "street",
      label: `${address.street} ${address.home}`,
      streetId: address.streetId,
      street: address.street,
      home: address.home,
      city: address.city,
    });
    diagnostics.push(...(resolved.diagnostics ?? []));
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
