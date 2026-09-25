import OrderAddress from "../../interfaces/OrderAddress";
import { AddressDescription, AddressLocation, AddressNode, AddressPoint } from "../../interfaces/Geo";

/**
 * Where an address is, what address is at a point, and the catalog a customer
 * picks one from.
 *
 * One adapter serves an installation, chosen by `GEO_ADAPTER`. Delivery asks it
 * for the coordinate of an address, the storefront for suggestions and for the
 * address the customer is standing at, `Order` for the line it saves.
 *
 * The contract only. How addresses are stored, which geocoder is asked and what
 * a node type means are the implementation's: the default one keeps its catalog
 * in `Address`, and no other code reads that model.
 */
export default abstract class GeoAdapter {
  /**
   * The coordinate of an address. `coordinate: null` when it cannot be placed;
   * `unrecognized` when a geocoder was asked and failed.
   */
  public abstract locate(address: OrderAddress | undefined | null): Promise<AddressLocation>;

  /** The address a customer is standing at, for the storefront's "detect my location". */
  public abstract addressByCoordinate(coordinate: AddressPoint, city: string): Promise<OrderAddress | null>;

  /**
   * What to offer for what the customer has typed: from the city without
   * `parent`, among that node's children with one.
   */
  public abstract search(params: { city: string; parent?: string | null; query: string }): Promise<AddressNode[]>;

  /** The nodes from the city down to `id`, in that order. */
  public abstract path(id: string): Promise<AddressNode[]>;

  /** The line an order saves for this address, and whether it still needs a house number. */
  public abstract describe(address: OrderAddress): Promise<AddressDescription>;
}
