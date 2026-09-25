/**
 * The address on an order: a leaf of the catalog plus the part of an address
 * that is never in a catalog.
 *
 * `node` is the deepest node the customer actually chose — a street when the
 * catalog has no houses under it, a house when it does. `formatted` is that
 * node's path with the house number appended, rebuilt on save, and it is what
 * an operator and a courier read. Everything below `city` is the tail that only
 * the recipient knows.
 *
 * The one shape of "an address to deliver to": `Order.address`, a saved
 * `UserLocation` (without `node`), what a delivery adapter checks and what
 * `addressByCoordinate` answers. The catalog itself is `AddressRecord`.
 */
import { AddressPoint } from "./Geo";

export default interface OrderAddress {
  /** Deepest chosen node of the city's address catalog. Null for free text. */
  node?: string | null;
  /** "Ленина, 12". Rebuilt by the geo adapter's `describe` from the node and `home` when there is a node. */
  formatted?: string;
  city?: string;
  home?: string;
  housing?: string;
  apartment?: string;
  entrance?: string;
  floor?: string;
  doorphone?: string;
  comment?: string;
  /** Set when it is known without asking a geocoder. Same shape as `Place.coordinate`. */
  coordinate?: AddressPoint | null;
}
