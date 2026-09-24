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
