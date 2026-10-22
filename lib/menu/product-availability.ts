import { readsEveryPoint } from "./cooking-place";
import type { MenuContext } from "../../interfaces/Menu";
import {
  UNLIMITED_BALANCE,
  getEffectiveBalanceFor,
  getEffectiveBalances,
  isStopped,
  readEffectiveBalance,
} from "./dish-place-balance";

/**
 * One answer to "may this product be sold at this point" — and why not, when the
 * answer is no. The menu, the add-to-basket path and the recount all ask it here,
 * so they cannot disagree; they differ only in what they do with a refusal.
 *
 * Stock and the product's own flags only: a refusal is about one product and
 * removes one basket line. Whether the point is open is another question with
 * another answer — the menu leaves a closed point out (`MenuAdapter.resolveContext`)
 * and checkout refuses it — and it must not come in here: the recount would then
 * empty every basket of a kitchen at its closing time.
 */

/**
 * Why a product cannot be sold.
 *
 * `notForSale` and `modifier` are deliberately absent. Both describe what a
 * catalog row *is* rather than whether it can be had: a `notForSale` product is
 * shown in the menu and rides along in the basket at zero, and a modifier is not
 * a standalone product at all. Folding either one in here would make this
 * function refuse rows the menu has always shown, which is exactly the
 * regression the "default mode leaves the menu unchanged" criterion forbids.
 * `addDish` still rejects both, in its own words, where they mean something.
 */
export type ProductUnavailableReason =
  | "PRODUCT_DISABLED"
  | "PRODUCT_STOPPED_AT_PLACE"
  | "PRODUCT_NOT_ENOUGH_AT_PLACE"
  /** Every point of the menu is closed now: `MenuAdapter.canAddProduct` only. */
  | "PLACE_CLOSED";

/**
 * What availability needs to know about a product.
 *
 * A structural shape rather than `DishRecord` on purpose: this file is imported
 * by `models/Dish` and importing the model back would close a require cycle. A
 * real record satisfies it.
 */
export interface AvailabilityProduct {
  // Optional because `DishRecord` types it that way — every attribute of that
  // model is optional. A row with no id matches no stock row and so reads as
  // unlimited, which is the same answer a product nobody has stocked gets.
  id?: string | number | null;
  type?: string | null;
  enable?: boolean | null;
  cookingTimeMax?: number | null;
}

export interface ProductAvailability {
  productId: string;
  available: boolean;
  reason: ProductUnavailableReason | null;
  /** Effective stock at the point; `-1` is unlimited, `0` is a stop. */
  balance: number;
}

/**
 * Only `dish` is cooked.
 *
 * A bottle of water and a delivery service are not prepared, so they must not
 * push the promised time out; the plan says so, and it is also the only reading
 * under which a basket of drinks is not quoted a kitchen's cooking time.
 */
export function isCooked(product: Pick<AvailabilityProduct, "type">): boolean {
  return product?.type === "dish";
}

/**
 * Whether one product can be sold at a point, given the stock already read there.
 *
 * Pure: no settings, no database. The caller has the balance because it reads the
 * whole basket's stock in one query.
 */
export function evaluateProductAvailability(
  product: AvailabilityProduct,
  balance: number,
  amount: number = 1,
): ProductAvailability {
  const productId = String(product?.id);
  const answer = (reason: ProductUnavailableReason | null): ProductAvailability => ({
    productId,
    available: reason === null,
    reason,
    balance,
  });

  if (product?.enable === false) return answer("PRODUCT_DISABLED");
  if (isStopped(balance)) return answer("PRODUCT_STOPPED_AT_PLACE");
  // `-1` is unlimited and never short; any other value is a real ceiling.
  if (balance !== UNLIMITED_BALANCE && amount > balance) return answer("PRODUCT_NOT_ENOUGH_AT_PLACE");

  return answer(null);
}

/**
 * Availability of many products at one point, in one stock query.
 *
 * A `null` point means no stock is known anywhere, which is unlimited — that is
 * the legacy answer and the reason an installation with no cooking point
 * configured keeps selling.
 */
export async function getProductsAvailability(
  products: AvailabilityProduct[],
  placeId: string | null,
): Promise<Map<string, ProductAvailability>> {
  const availability = new Map<string, ProductAvailability>();
  if (!products.length) return availability;

  const balances = await getEffectiveBalances(products.map((product) => String(product.id)), placeId);

  for (const product of products) {
    const evaluated = evaluateProductAvailability(product, readEffectiveBalance(balances, product.id));
    availability.set(evaluated.productId, evaluated);
  }
  return availability;
}

/** Availability of one product at one point, for a requested amount. */
export async function getProductAvailability(
  product: AvailabilityProduct,
  placeId: string | null,
  amount: number = 1,
): Promise<ProductAvailability> {
  const balances = await getEffectiveBalances([String(product.id)], placeId);
  return evaluateProductAvailability(product, readEffectiveBalance(balances, product.id), amount);
}

/**
 * Stock of one product across the points of a menu context, for the storefront:
 * as many as `MenuAdapter.canAddProduct` will let into a basket.
 *
 * A union takes the best-stocked point, unlimited if any point is. An
 * intersection (`readsEveryPoint`) takes the worst-stocked one, unlimited only
 * if every point is. Unlimited when no point is known. Lives here so the
 * GraphQL `Dish.balance` field does not implement either a second time.
 */
export async function getEffectiveBalanceAcross(
  productId: string,
  context: Pick<MenuContext, "placeIds" | "source">,
): Promise<number> {
  const every = readsEveryPoint(context);
  let answer: number | null = null;
  for (const placeId of context.placeIds) {
    const balance = await getEffectiveBalanceFor(productId, placeId);
    if (balance === UNLIMITED_BALANCE) {
      if (every) continue;
      return UNLIMITED_BALANCE;
    }
    if (answer === null || (every ? balance < answer : balance > answer)) answer = balance;
  }
  return answer ?? UNLIMITED_BALANCE;
}

/**
 * How long the kitchen needs for a basket, in minutes.
 *
 * The maximum, not the sum: the positions of one order are prepared in parallel,
 * so a basket is ready when its slowest line is. Products and services are
 * skipped entirely — see `isCooked`.
 *
 * A cooked product with no time configured contributes nothing rather than a
 * guess. Inventing a default here would put a number nobody entered into a
 * promise made to a customer, so a basket of unfilled dishes quotes the road
 * alone — understated, never overstated.
 */
export function getPreparationMinutes(products: AvailabilityProduct[]): number {
  let minutes = 0;

  for (const product of products) {
    if (!isCooked(product)) continue;

    const configured = toMinutes(product.cookingTimeMax) ?? 0;
    if (configured > minutes) minutes = configured;
  }

  return minutes;
}

function toMinutes(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}
