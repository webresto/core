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

/** Where an address turned out to be, and whether the attempt failed outright. */
export interface AddressLocation {
  coordinate: AddressPoint | null;
  /** Set when the geocoder was asked and could not place the address. */
  unrecognized: boolean;
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

/** What an order's address reads as, and whether it still needs a house number. */
export interface AddressDescription {
  /** The line an operator and a courier read. */
  formatted: string;
  /** The chosen node is the place to knock at by itself, so no house number is asked. */
  selfAddressed: boolean;
}
