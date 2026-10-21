/** Same shape as `Place.coordinate`: one way to spell a point in this schema. */
export interface AddressPoint {
  lat: number;
  lon: number;
}

/** The bounds a `range` node covers: `lo..hi`. `null` on either side means unbounded. */
export interface AddressRange {
  lo?: number | null;
  hi?: number | null;
}

/** What any geocoder can say about a point: the parts it knows, and one line always. */
export interface GeoAddress {
  city?: string;
  street?: string;
  home?: string;
  /** The address as one line, house number included when there is one. */
  formatted: string;
}

/** Where an address turned out to be, and how that was decided. */
export interface AddressLocation {
  coordinate: AddressPoint | null;
  diagnostics: string[];
}

/** One node of a city address catalog, as the storefront reads it. */
export interface AddressNode {
  id: string;
  type: string;
  name: string;
  /** The node above; `null` for a node the city holds directly. */
  parent: string | null;
  point: AddressPoint | null;
  /** Names of the nodes above, from the root down. */
  ancestors: string[];
}

/** A house a geocoder knows exactly: its street, its number and the point of the house itself. */
export interface GeocodedHouse {
  /** The street line as the geocoder writes it, with its type word ("Lenina street"). */
  street: string;
  /** The house number, letters and blocks included ("12a", "5 bldg 2"). */
  home: string;
  point: AddressPoint;
}

/**
 * A geocoder outside core, attached to the default geo adapter by a module (`registerGeocoder`).
 *
 * Asked only for what the catalog does not know, in ascending `priority`, until one answers. It
 * answers houses only, and only those whose point is the house itself: a street or a town is not
 * an answer — cached, it would pull every click towards the middle of a street. A request that
 * failed throws; the next geocoder is asked.
 */
export interface Geocoder {
  /** The geocoder's name: in the logs and in the cache mark of what it found. */
  name: string;
  /** The smaller is asked first. */
  priority: number;
  /** The houses around a point, the nearest first. */
  housesAround(point: AddressPoint, radiusMeters: number): Promise<GeocodedHouse[]>;
  /** The house at a street and a number of a city; `null` when it is not known exactly. */
  house(parts: { city: string; street: string; home: string }): Promise<GeocodedHouse | null>;
}

/** The mark of a catalog node a geocoder found: which geocoder, and the street line it gave. */
export interface AddressCache {
  source: string;
  street: string;
}

/** What an order's address reads as, and whether it still needs a house number. */
export interface AddressDescription {
  /** The line an operator and a courier read. */
  formatted: string;
  /** The chosen node is the place to knock at by itself, so no house number is asked. */
  selfAddressed: boolean;
}
