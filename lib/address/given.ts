import OrderAddress from "../../interfaces/OrderAddress";
import { coordinateFromAddress } from "./coordinate";

/**
 * Whether an order's address names a place to deliver to: a catalog node, a
 * line of text or a coordinate.
 *
 * An address holding only `city` is not one. The storefront writes it when the
 * customer switches city: the basket then knows which city's kitchens to read
 * its stock at, and still has to ask where to deliver.
 */
export function isAddressGiven(address: OrderAddress | null | undefined): address is OrderAddress {
  if (!address) return false;
  const text = (value: unknown) => typeof value === "string" && value.trim() !== "";
  return text(address.node) || text(address.formatted) || coordinateFromAddress(address) !== null;
}
