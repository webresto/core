import { isEnabledKitchen, placeAcceptsOrdersNow } from "./cooking-place";
import {
  UNLIMITED_BALANCE,
  getEffectiveBalanceFor,
  getEffectiveBalances,
  isStopped,
  readEffectiveBalance,
} from "./dish-place-balance";

/**
 * One answer to "may this be sold, here, now" — and why not, when the answer is no.
 *
 * Availability had been three separate comparisons scattered across the menu, the
 * add-to-cart path and the recount, and each of them knew about stock only. The
 * fifth iteration adds two more inputs — the point's schedule and the product's
 * type — and adding those in three places is how three copies start disagreeing.
 * So there is one evaluation here, and callers differ only in what they do with a
 * refusal.
 *
 * The two questions this file answers are deliberately kept apart:
 *
 * - **is the product sellable at this point** — stock and the product's own
 *   flags. A refusal is about one product and removes one basket line;
 * - **can this point take an order at all** — enabled, and open at the moment
 *   asked about. A refusal is about the whole order.
 *
 * Merging them would mean a closed kitchen deletes every line of every basket at
 * closing time, which is not what closing a kitchen means. The installation-wide
 * `WORK_TIME` already shows the right shape: it blocks checkout in
 * `Order.checkDate` and leaves baskets alone. A point's schedule does the same,
 * one point down.
 */

export type MenuPlaceBasedMode = "default" | "single-place" | "multi-place-route";

export const MENU_PLACE_BASED_MODES: MenuPlaceBasedMode[] = ["default", "single-place", "multi-place-route"];

export const DEFAULT_MENU_PLACE_BASED_MODE: MenuPlaceBasedMode = "default";

export function normalizeMenuPlaceBasedMode(value: unknown): MenuPlaceBasedMode {
  return MENU_PLACE_BASED_MODES.includes(value as MenuPlaceBasedMode)
    ? (value as MenuPlaceBasedMode)
    : DEFAULT_MENU_PLACE_BASED_MODE;
}

/** Reads the configured menu mode, falling back to the legacy-compatible default. */
export async function getMenuPlaceBasedMode(): Promise<MenuPlaceBasedMode> {
  return normalizeMenuPlaceBasedMode(await Settings.get("MENU_PLACE_BASED_MODE"));
}

/** Whether the mode requires a point before the customer may put anything in a basket. */
export function modeRequiresPlace(mode: MenuPlaceBasedMode): boolean {
  return mode !== "default";
}

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
  | "PRODUCT_NOT_ENOUGH_AT_PLACE";

export type PlaceUnavailableReason = "PLACE_NOT_SELECTED" | "PLACE_DISABLED" | "PLACE_CLOSED";

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

export interface PlaceAvailability {
  placeId: string | null;
  /** The point may take an order at the moment asked about. */
  open: boolean;
  reason: PlaceUnavailableReason | null;
}

/**
 * Only `dish` is cooked.
 *
 * A bottle of water and a delivery service are not prepared, so they must not
 * push the promised time out; the plan says so, and it is also the only reading
 * under which a basket of drinks is not quoted a kitchen's cooking time.
 */
export function isCooked(product: Pick<AvailabilityProduct, "type">): boolean {
  // Rows created before the type existed were backfilled to `dish`, and an
  // adapter that omits the field still gets `dish` on create — so an absent type
  // means "dish" here too, rather than silently dropping out of the estimate.
  return (product?.type ?? "dish") === "dish";
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
 * Whether a point can take an order, at a moment.
 *
 * Pure, for the same reason as above: the caller already has the `Place` record.
 * `at` defaults to now; a pre-order asks about the moment it will be cooked, and
 * that is a different answer from the one the clock gives right now.
 */
export function evaluatePlaceAvailability(place: any, at?: Date): PlaceAvailability {
  const placeId = place?.id ? String(place.id) : null;

  if (!place) return { placeId: null, open: false, reason: "PLACE_NOT_SELECTED" };
  if (!isEnabledKitchen(place)) return { placeId, open: false, reason: "PLACE_DISABLED" };
  if (!placeAcceptsOrdersNow(place, at)) return { placeId, open: false, reason: "PLACE_CLOSED" };

  return { placeId, open: true, reason: null };
}

/** Reads the point and answers whether it can take an order at `at`. */
export async function getPlaceAvailability(
  placeId: string | null | undefined,
  at?: Date,
): Promise<PlaceAvailability> {
  if (!placeId) return { placeId: null, open: false, reason: "PLACE_NOT_SELECTED" };
  const place = await Place.findOne({ id: String(placeId) });
  // A point that is gone is not a closed point: it cannot be reopened by waiting.
  if (!place) return { placeId: String(placeId), open: false, reason: "PLACE_DISABLED" };
  return evaluatePlaceAvailability(place, at);
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
 * Stock of one product across the points of a menu context, for the storefront.
 *
 * The maximum: the customer can have as many as the best-stocked point holds.
 * Unlimited when no point is known or any point is unlimited. Lives here so
 * the GraphQL `Dish.balance` field does not implement the union a second time.
 */
export async function getEffectiveBalanceAcross(productId: string, placeIds: string[]): Promise<number> {
  let best: number | null = null;
  for (const placeId of placeIds) {
    const balance = await getEffectiveBalanceFor(productId, placeId);
    if (balance === UNLIMITED_BALANCE) return UNLIMITED_BALANCE;
    if (best === null || balance > best) best = balance;
  }
  return best ?? UNLIMITED_BALANCE;
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
