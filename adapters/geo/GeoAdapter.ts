import { AddressPoint } from "./address";

/** What any geocoder can say about a point: the parts it knows, and one line always. */
export interface GeoAddress {
  city?: string;
  street?: string;
  home?: string;
  /** The address as one line, house number included when there is one. */
  formatted: string;
}

/**
 * Where an address is, and what address is at a point.
 *
 * One adapter serves an installation, chosen by `GEO_ADAPTER`. Delivery asks it
 * for the coordinate of an address the catalog cannot place; the storefront asks
 * it, through `addressByCoordinate`, which address the customer is standing at.
 */
export default abstract class GeoAdapter {
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
}
