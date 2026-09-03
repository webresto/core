/**
 * What delivery exchanges with the outside world.
 *
 * These types live apart from `DeliveryAdapter.ts` on purpose. The adapter class
 * imports the extension registry, the registry imports these contracts, and
 * everything under `lib/` needs the contracts without needing the class — put
 * them back in the class file and that becomes a runtime require cycle, not just
 * a type-level one.
 *
 * Nothing here imports anything: contracts describe shapes, they do not reach for
 * models, settings or adapters.
 */

/**
 * **Soft delivery calculation**
 * This is done so that some deliveries can agree on the cost of delivery themselves.
 * If it is `allowed = true` and the `cost = null`,
 * then this is only possible if the required delivery calculation flag is absent
 */
export interface Delivery {
  /**
   * `null` when no promise can be made — an address outside every zone, or one
   * that could not be placed on the map. GraphQL has always exposed this field
   * as a nullable `Int`; the declaration here just caught up.
   */
  deliveryTimeMinutes: number | null
  allowed: boolean
  /** `undefined` when `item` carries the price instead. */
  cost: number | null | undefined
  item: string | undefined
  message: string,
  /**
   * A flag that shows that it was not possible to recognize how to make a delivery
   * street and house number not found.
   */
  deliveryLocationUnrecognized?: boolean
  /**
   * This flag indicates that there was an error not related to business logic. Any error like new Error
   */
  hasError?: boolean
  /** The zone whose terms produced this result, when one matched. */
  zoneId?: string
  /**
   * The promised time.
   *
   * Additive and optional: an adapter that only prices
   * delivery has nothing to say about how long cooking takes, and every adapter
   * written before these existed keeps compiling. `deliveryTimeMinutes` above is
   * untouched and still means the delivery leg alone — this is the whole
   * promise, cooking included, which is a different number and must not quietly
   * replace it.
   */
  preparationMinutes?: number
  totalTimeMinutes?: number
  /** Straight-line kilometres from the kitchen, when both coordinates were known. */
  distanceKm?: number
  /** `haversine`, a provider's name, or `none`. */
  travelTimeSource?: string
  /** Why the calculation ended up where it did; for operators, never customers. */
  diagnostics?: string[]
}

/** `{ lat, lng }`, matching `Place.coordinate`. Polygons are stored `[lon, lat]`. */
export type DeliveryCoordinate = {
  lat: number;
  lng: number;
}

/** How long the road from the kitchen to the customer takes, and how it was worked out. */
export interface TravelEstimate {
  distanceKm: number;
  travelMinutes: number;
  /** `haversine` is the built-in straight-line estimate; anything else is an adapter's own. */
  source: string;
}

/**
 * One entry of an address or organization suggestion list.
 *
 * The two searches are deliberately separate result sets rather than one mixed
 * list: an address query must never surface the laundry registered at that
 * address, so `kind` is decided by which method produced the row, not by
 * guessing from the query text.
 */
export interface DeliveryLocationSearchResult {
  id: string;
  kind: "street" | "organization";
  label: string;
  /** Normalized address parts, when the source knows them. */
  streetId?: string;
  street?: string;
  home?: string;
  /**
   * The city the customer named.
   *
   * Carried on the selection rather than read from a setting: the install serves
   * several cities, and the only city that can correctly qualify this address is
   * the one it arrived with.
   */
  city?: string;
  /** An organization may carry a ready coordinate or only a handler reference. */
  coordinate?: DeliveryCoordinate;
  organizationType?: string;
}

/** A selection turned into something delivery can actually be calculated for. */
export interface ResolvedDeliveryLocation {
  coordinate: DeliveryCoordinate;
  streetId?: string;
  street?: string;
  home?: string;
  source: "client-coordinate" | "organization-coordinate" | "geocoded-address";
  diagnostics?: string[];
}

/**
 * What an adapter can do beyond pricing.
 *
 * There is deliberately no `supportsZoneSync` here any more. Whether zones come
 * from outside is answered by the extension registry, and a second answer living
 * on the adapter could only ever start disagreeing with the first.
 */
export interface DeliveryAdapterCapabilities {
  supportsAddressSearch?: boolean;
  supportsOrganizationSearch?: boolean;
}

/** One zone as an external source describes it. Never a database row. */
export interface ImportedDeliveryZone {
  /** Stable identifier in the source. Required: without it nothing can be matched. */
  externalId: string;
  name: string;
  description?: string;
  /** Ring of `[lon, lat]` pairs. */
  polygon: number[][];
  sourceHash?: string;
  sourceUpdatedAt?: string;
  /**
   * The layer this zone sits in, when the source has layers at all.
   *
   * A KML folder is a layer; a file with no folders yields zones with no layer.
   * Groups are never guessed from names — the first map named differently would
   * break the guess, and a wrong grouping silently reprices zones.
   *
   * `externalId` must not collide with a zone's: the two share one identity
   * space inside a source and a city. A source that invents layer ids namespaces
   * them, which is why this is the source's business and not core's.
   */
  layer?: { externalId: string; name: string };
}

export interface DeliveryZoneSnapshot {
  /** Name of the source, e.g. `kml`. Identifies the rows this snapshot owns. */
  source: string;
  /**
   * The city these zones belong to, when the installation has more than one.
   *
   * A snapshot owns the zones of one source *in one city* and no others. Leaving
   * this out on a multi-city installation would make each city's sync mark every
   * other city's zones as missing from the source.
   */
  city?: string | null;
  fetchedAt: string;
  zones: ImportedDeliveryZone[];
  /**
   * Whether descriptions in the source may overwrite local ones. Off by default
   * because operators routinely write delivery terms into that field.
   */
  updateDescriptions?: boolean;
}

export type DeliveryLocationErrorCode =
  | "DELIVERY_LOCATION_UNRESOLVABLE"
  | "DELIVERY_LOCATION_GEOCODER_FAILED";

/**
 * A machine-readable refusal to turn a selection into a coordinate.
 *
 * It blocks this one delivery calculation and nothing else, so the UI can say
 * which part of the address is missing instead of showing a generic failure.
 */
export class DeliveryLocationError extends Error {
  public readonly code: DeliveryLocationErrorCode;
  public readonly diagnostics: string[];

  constructor(code: DeliveryLocationErrorCode, message?: string, diagnostics: string[] = []) {
    super(message ?? code);
    this.name = "DeliveryLocationError";
    this.code = code;
    this.diagnostics = diagnostics;
  }
}

/** Raised when core calls a capability method the configured adapter lacks. */
export class DeliveryCapabilityError extends Error {
  public readonly code = "DELIVERY_CAPABILITY_UNSUPPORTED";

  constructor(capability: string) {
    super(`Delivery adapter does not support ${capability}`);
    this.name = "DeliveryCapabilityError";
  }
}