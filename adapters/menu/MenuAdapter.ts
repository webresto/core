import {
  AvailabilityProduct,
  ProductAvailability,
  getProductAvailability,
  getProductsAvailability,
} from "../../lib/product-availability";
import { MenuContext, MenuRequest } from "./contracts";

/**
 * Which menu a customer sees, and which point it is read at.
 *
 * Two questions, one adapter, because they cannot be answered independently.
 * "Read the menu at the north kitchen" and "hide what the north kitchen cannot
 * cook" are the same decision seen from two ends, and an installation that
 * changes one always means to change the other.
 *
 * The context names points in the plural, and the defaults below read them as
 * a union: a product is in the menu if *any* of them can sell it. A module
 * that names two or three kitchens for one customer only has to override
 * `resolveContext`; the filter and the add-to-basket check already agree with
 * it. Both built-in adapters name at most one point, so nothing changes for
 * an installation running them.
 *
 * Capability methods are plain methods with defaults, never `abstract`, the same
 * rule `DeliveryAdapter` follows: an adapter written before a method existed has
 * to keep compiling.
 */
export default abstract class MenuAdapter {
  /** Identity, and what `MENU_PLACE_BASED_MODE` resolves to. */
  public abstract readonly name: string;

  /** Which point this menu is read at, given what the caller knows. */
  public abstract resolveContext(request: MenuRequest): Promise<MenuContext>;

  /**
   * Narrows a product list to what the context can actually sell.
   *
   * The default is the availability service, point by point, kept if any point
   * can sell it. No points means no stock is known, and nothing is dropped.
   * `SHOW_UNAVAILABLE_DISHES` is honoured here rather than at the call sites:
   * it is a statement about the menu, and it used to be checked in one place
   * and forgotten in three others.
   */
  public async filterProducts<T extends AvailabilityProduct>(
    products: T[],
    context: MenuContext,
  ): Promise<T[]> {
    if (!products.length || !context.placeIds.length) return products;
    if (await Settings.get("SHOW_UNAVAILABLE_DISHES")) return products;

    const sellable = new Set<string>();
    for (const placeId of context.placeIds) {
      const availability = await getProductsAvailability(products, placeId);
      for (const [productId, verdict] of availability) {
        if (verdict.available) sellable.add(productId);
      }
    }
    return products.filter((product) => sellable.has(String(product.id)));
  }

  /**
   * Whether this product, in this quantity, may go into a basket.
   *
   * Separate from `filterProducts` because it is the same question asked with a
   * quantity attached, and because the two must never diverge: an adapter that
   * shows a product and then refuses to let a customer add it has produced the
   * worst outcome available to it. Overriding one without the other is how that
   * happens, so they sit next to each other.
   *
   * Allowed if any point of the context allows it; the verdict returned is the
   * first point's that did, or the first point's refusal when none did. No
   * points reads as unlimited, the same as the filter.
   */
  public async canAddProduct(
    product: AvailabilityProduct,
    amount: number,
    context: MenuContext,
  ): Promise<ProductAvailability> {
    if (!context.placeIds.length) return getProductAvailability(product, null, amount);

    let refused: ProductAvailability | null = null;
    for (const placeId of context.placeIds) {
      const verdict = await getProductAvailability(product, placeId, amount);
      if (verdict.available) return verdict;
      refused ??= verdict;
    }
    return refused!;
  }
}
