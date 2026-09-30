import {
  AvailabilityProduct,
  ProductAvailability,
  getProductAvailability,
  getProductsAvailability,
} from "../../lib/menu/product-availability";
import {
  findCityId,
  getEnabledCookingPlaceIds,
  getOrderCityKitchenIds,
  isEnabledKitchen,
  placeAcceptsOrdersNow,
  placeIsOpen,
  primaryCookingPoint,
  readsEveryPoint,
  toPlaceId,
} from "../../lib/menu/cooking-place";
import { UNLIMITED_BALANCE } from "../../lib/menu/dish-place-balance";
import { productFitsMaxWait } from "../../lib/order/order-timing";
import {
  KitchenResolution,
  KitchenResolveRequest,
  KitchenStrategyName,
  LinePlacement,
  MenuContext,
  MenuOrder,
  MenuRequest,
  OrderDishId,
} from "../../interfaces/Menu";
import { AddressPoint } from "../../interfaces/Geo";
import { Delivery } from "../../interfaces/Delivery";
import { OrderRecord } from "../../models/Order";
import { DishRecord } from "../../models/Dish";

/**
 * Which menu a customer sees, and which point it is read at.
 *
 * Two questions, one adapter, because they cannot be answered independently.
 * "Read the menu at the north kitchen" and "hide what the north kitchen cannot
 * cook" are the same decision seen from two ends, and an installation that
 * changes one always means to change the other.
 *
 * Only `resolvePlaces` is left to an implementation. Everything else here is
 * core's rule and reads the same for any of them: the context names points in
 * the plural and they are read as a union — a product is in the menu if *any*
 * of them can sell it — so an adapter that names several kitchens gets a filter
 * and an add-to-basket check that already agree with it. The one exception is
 * an order with no kitchen yet (`unaddressedKitchens`): the kitchens it could
 * still end up at, read as an intersection.
 *
 * A multi-kitchen route plugs in through `placeLines` and `adjustDelivery`.
 * Core ships the contract and no route: what a route is and how it is priced
 * is a module's business.
 *
 * `resolveContext` and `filterProducts` are the entry points and are not meant
 * to be overridden: each wraps the adapter's own step in one that belongs to
 * the order, so every adapter gets it without writing it.
 */
export default abstract class MenuAdapter {
  /** Which points this menu is read at, given what the caller knows. */
  protected abstract resolvePlaces(request: MenuRequest): Promise<Omit<MenuContext, "order">>;

  /**
   * The adapter's points, and the order they were resolved for.
   *
   * Without the points closed at the moment the order is for — now, or a
   * pre-order's date: a closed kitchen offers nothing. Every point closed is
   * `PLACE_CLOSED`. `ignoreSchedule` skips this, for what is already in a basket.
   */
  public async resolveContext(request: MenuRequest): Promise<MenuContext> {
    const context: MenuContext = { ...(await this.resolvePlaces(request)), order: request.order ?? null };
    return request.ignoreSchedule ? context : withoutClosedPoints(context);
  }

  /**
   * The menu of an order with no kitchen yet: the kitchens it could still end
   * up at, and a product only if each of them can sell it (`readsEveryPoint`).
   * Whichever of them the address later picks, what was shown stays on offer.
   *
   * The order's city when it names one — `city` — else every city — `all`.
   * A city with no enabled kitchen falls through to every city. No clock, like
   * every stock lookup.
   *
   * Core's rule rather than an adapter's: every adapter ends its
   * `resolvePlaces` here. No kitchen at all is `none` — unlimited, or a
   * refusal where the adapter requires a point.
   */
  protected async unaddressedKitchens(
    order: MenuOrder | null | undefined,
    placeRequired: boolean,
  ): Promise<Omit<MenuContext, "order">> {
    const cityKitchens = await getOrderCityKitchenIds(order);
    if (cityKitchens.length) {
      return {
        placeIds: cityKitchens,
        source: "city",
        placeRequired,
        diagnostics: [`no kitchen yet, menu read at every kitchen of the order's city: ${cityKitchens.join(", ")}`],
      };
    }

    const placeIds = await getEnabledCookingPlaceIds();
    if (placeIds.length) {
      return {
        placeIds,
        source: "all",
        placeRequired,
        diagnostics: [`no kitchen and no city, menu read at every kitchen: ${placeIds.join(", ")}`],
      };
    }

    // "We do not know which kitchen" must not read as "every kitchen has
    // everything" where the mode asks for a kitchen.
    if (placeRequired) {
      return {
        placeIds: [],
        source: "none",
        placeRequired,
        code: "MENU_PLACE_REQUIRED",
        diagnostics: ["the menu needs a cooking point: none named and no enabled kitchen"],
      };
    }

    return {
      placeIds: [],
      source: "none",
      placeRequired,
      diagnostics: ["no enabled kitchen, stock is unlimited"],
    };
  }

  /**
   * Narrows a product list to what the context can offer.
   *
   * The order's step first: with `maxWaitMinutes` set, a product that alone
   * takes longer to cook is hidden, whatever the adapter. Then the adapter's
   * `filterSellable`.
   */
  public async filterProducts<T extends AvailabilityProduct>(
    products: T[],
    context: MenuContext,
  ): Promise<T[]> {
    if (context.code === "PLACE_CLOSED" && !(await Settings.get("SHOW_UNAVAILABLE_DISHES"))) return [];
    const maxWaitMinutes = context.order?.maxWaitMinutes;
    return this.filterSellable(
      products.filter((product) => productFitsMaxWait(product, maxWaitMinutes)),
      context,
    );
  }

  /**
   * What the context's points can sell.
   *
   * The default is the availability service, point by point, kept if any point
   * can sell it — each of them where the context `readsEveryPoint`. No points
   * means no stock is known, and nothing is dropped.
   * `SHOW_UNAVAILABLE_DISHES` is honoured here rather than at the call sites:
   * it is a statement about the menu, and it used to be checked in one place
   * and forgotten in three others.
   * @TODO: All filters are performed in RAM, which is not very efficient. It would be better to use Joins with a point‑by‑point balance decomposition model after we switch to ORM.
   */
  protected async filterSellable<T extends AvailabilityProduct>(
    products: T[],
    context: MenuContext,
  ): Promise<T[]> {
    if (!products.length || !context.placeIds.length) return products;
    if (await Settings.get("SHOW_UNAVAILABLE_DISHES")) return products;

    const sellingPoints = new Map<string, number>();
    for (const placeId of context.placeIds) {
      const availability = await getProductsAvailability(products, placeId);
      for (const [productId, verdict] of availability) {
        if (verdict.available) sellingPoints.set(productId, (sellingPoints.get(productId) ?? 0) + 1);
      }
    }
    const needed = readsEveryPoint(context) ? context.placeIds.length : 1;
    return products.filter((product) => (sellingPoints.get(String(product.id)) ?? 0) >= needed);
  }

  /**
   * Whether this product, in this quantity, may go into a basket.
   *
   * Separate from `filterSellable` because it is the same question asked with a
   * quantity attached, and because the two must never diverge: an adapter that
   * shows a product and then refuses to let a customer add it has produced the
   * worst outcome available to it. Overriding one without the other is how that
   * happens, so they sit next to each other.
   *
   * Allowed if any point of the context allows it; the verdict returned is the
   * first point's that did. When none did, the refusal with the most left:
   * "only two left" is worth saying, "stopped everywhere" is what is left. No
   * points reads as unlimited, the same as the filter.
   *
   * Where the context `readsEveryPoint`, each point must allow it: the first
   * refusal is the answer, else the verdict of the point with the least left.
   */
  public async canAddProduct(
    product: AvailabilityProduct,
    amount: number,
    context: MenuContext,
  ): Promise<ProductAvailability> {
    if (context.code === "PLACE_CLOSED") {
      return { productId: String(product.id), available: false, reason: "PLACE_CLOSED", balance: 0 };
    }
    if (!context.placeIds.length) return getProductAvailability(product, null, amount);

    if (readsEveryPoint(context)) {
      let tightest: ProductAvailability | null = null;
      for (const placeId of context.placeIds) {
        const verdict = await getProductAvailability(product, placeId, amount);
        if (!verdict.available) return verdict;
        if (!tightest || stockOf(verdict.balance) < stockOf(tightest.balance)) tightest = verdict;
      }
      return tightest!;
    }

    let refused: ProductAvailability | null = null;
    for (const placeId of context.placeIds) {
      const verdict = await getProductAvailability(product, placeId, amount);
      if (verdict.available) return verdict;
      if (!refused || verdict.balance > refused.balance) refused = verdict;
    }
    return refused!;
  }

  /**
   * Where the lines of an order being recalculated are cooked, and what stock
   * each has there.
   *
   * The base answer is one kitchen for the whole basket — the one the resolver
   * assigned — with every line judged by `canAddProduct` against the context.
   * That is the question the line answered when it went in, and it has to be:
   * judging it against the primary kitchen alone deletes, on the first recount,
   * a product a menu spanning several points showed and let the customer add.
   *
   * A routing module would override this to plan a route, put lines on its stops
   * and read their stock there. Its `placeIds` start with the assigned kitchen, and
   * `countCart` writes the answer as given: the order's kitchens, each line's
   * stop, and the plan into the journal.
   */
  public async placeLines(
    order: OrderRecord,
    lines: { orderDishId: OrderDishId; dish: DishRecord; amount: number }[],
      context: MenuContext,
    /**
     * The customer's address for multiple kitchens.
     */
    customer: AddressPoint | null,
  ): Promise<LinePlacement> {
    const byOrderDish: LinePlacement["byOrderDish"] = new Map();
    for (const line of lines) {
      byOrderDish.set(line.orderDishId, {
        placeId: null,
        availability: await this.canAddProduct(line.dish, line.amount, context),
      });
    }

    const placeId = primaryCookingPoint(order);
    return { placeIds: placeId ? [placeId] : [], byOrderDish, plan: null };
  }

  /**
   * What the way a basket was placed adds to its delivery.
   *
   * Asked by `countCart` right after the delivery adapter priced the order, so
   * whichever delivery adapter is in use, a route charges on top of it. The base
   * answer is the delivery as priced: one kitchen adds nothing.
   */
  public async adjustDelivery(_order: OrderRecord, delivery: Delivery): Promise<Delivery> {
    return delivery;
  }

  /**
   * Which kitchen cooks an order.
   *
   * A chain, not a rule: an installation says in what order to ask —
   * `KITCHEN_RESOLVE_CHAIN` — and the first strategy that names a kitchen wins.
   * The default chain asks every strategy. One that names no kitchen — an empty
   * chain, an address without a coordinate, every kitchen closed — leaves the
   * order's `cookingPoints` empty: its menu is read at the kitchens it could
   * still end up at (`unaddressedKitchens`), and checkout refuses it unless
   * soft delivery calculation hands it to an operator.
   *
   * The chain alone decides whether any of this runs. There is deliberately no
   * second switch next to it: one question gets one answer, in one place.
   *
   * A strategy answers "which kitchen" and nothing else. It does not price
   * delivery, does not check stock and does not write to the order — resolution
   * has to be safe to run again on every address change.
   *
   * Pickup and dine-in are settled before the chain and not by it. The customer
   * already chose the point they are going to, so there is nothing left to
   * resolve, and a strategy that "decided" to cook somewhere the customer is not
   * going would be a bug rather than a fallback. The chosen point is the kitchen
   * whatever the chain says, an empty one included.
   *
   * A method so that an installation can choose kitchens its own way in its own
   * menu adapter; the menu before an order and the kitchen chosen for it then
   * still agree, because both ask this.
   */
  public async resolveCookingPlace(request: KitchenResolveRequest = {}): Promise<KitchenResolution> {
    const diagnostics: string[] = [];

    if (request.serviceType && request.serviceType !== "delivery") {
      const pickupPointId = toPlaceId(request.pickupPointId);
      if (!pickupPointId) {
        diagnostics.push(`pickup: ${request.serviceType} order without a chosen point`);
        return { placeId: null, strategy: null, diagnostics };
      }

      const place = await Place.findOne({ id: pickupPointId });
      if (!isEnabledKitchen(place)) {
        // A particular case, not supported for now: a point that hands over food
        // cooked elsewhere — a counter in a mall — would need a kitchen of its
        // own, and nothing says which. Such a point is not offered for pickup or
        // dine-in, and checkout refuses it (`checkPickupPoint`).
        diagnostics.push(`pickup: ${pickupPointId} is not an enabled cooking point`);
        return { placeId: null, strategy: null, diagnostics };
      }

      diagnostics.push(`pickup: ${pickupPointId}`);
      return { placeId: pickupPointId, strategy: "pickup-point", diagnostics };
    }

    // The manifest's schema admits only known names, each once. `undefined` is
    // an environment value the schema refused.
    const chain = (await Settings.get("KITCHEN_RESOLVE_CHAIN")) ?? [];
    if (!chain.length) {
      diagnostics.push("KITCHEN_RESOLVE_CHAIN is empty, no cooking point is assigned");
      return { placeId: null, strategy: null, diagnostics };
    }

    // A delivery is cooked in the address's city and nowhere else.
    let inCity: InCity = () => true;
    if (request.city) {
      const cityId = await findCityId(request.city);
      inCity = (place) => cityId !== null && toPlaceId(place?.city) === cityId;
      diagnostics.push(cityId ? `kitchens of city ${cityId} only` : `city "${request.city}" is unknown: no kitchen`);
    }

    for (const name of chain) {
      try {
        const outcome = await strategies[name](request, diagnostics, inCity);
        if (outcome.kind === "resolved") {
          return { placeId: outcome.placeId, strategy: name, diagnostics };
        }
      } catch (error) {
        // One broken strategy must not take the whole chain down: the next one may
        // still know the answer, and an order without a kitchen is recoverable
        // where a failed recalculation is not.
        const message = error instanceof Error ? error.message : String(error);
        diagnostics.push(`${name}: failed (${message})`);
        sails.log.error(`Kitchen strategy "${name}" failed:`, error);
      }
    }

    diagnostics.push("no strategy in the chain named a cooking point");
    return { placeId: null, strategy: null, diagnostics };
  }
}

/**
 * The context without its points closed at the order's moment. A union loses
 * what they would have offered; an intersection stops waiting on them — the
 * resolver never picks a closed kitchen, so they are not where the order can
 * end up. None open is `PLACE_CLOSED`.
 */
async function withoutClosedPoints(context: MenuContext): Promise<MenuContext> {
  if (!context.placeIds.length) return context;

  const at = context.order?.date ? new Date(context.order.date) : undefined;
  // Cast because core types these globals as possibly undefined; the ORM is up
  // long before a menu is read.
  const places = (await (Place as any).find({ id: context.placeIds })) as any[];
  const open = context.placeIds.filter((id) => placeIsOpen(places.find((place) => String(place.id) === id), at));
  if (open.length === context.placeIds.length) return context;

  const closed = context.placeIds.filter((id) => !open.includes(id));
  const diagnostics = [...context.diagnostics, `closed now, left out of the menu: ${closed.join(", ")}`];
  return open.length
    ? { ...context, placeIds: open, diagnostics }
    : { ...context, placeIds: [], code: "PLACE_CLOSED", diagnostics };
}

/** Stock as a number to compare: `-1` is unlimited. */
function stockOf(balance: number): number {
  return balance === UNLIMITED_BALANCE ? Infinity : balance;
}

/** A strategy either names a kitchen or has no opinion and lets the next try. */
type StrategyOutcome =
  | { kind: "resolved"; placeId: string }
  | { kind: "pass" };

const PASS: StrategyOutcome = { kind: "pass" };

/** Whether a place is in the city the delivery is for (`KitchenResolveRequest.city`). */
type InCity = (place: any) => boolean;

type KitchenStrategy = (
  request: KitchenResolveRequest,
  diagnostics: string[],
  inCity: InCity,
) => Promise<StrategyOutcome>;

/**
 * The kitchen the RMS says serves this address.
 *
 * Core owns the question, the adapter owns the answer, and an adapter with no
 * answer is the normal case rather than an error — no RMS in this codebase
 * implements the hook yet, so today this strategy passes everywhere. An RMS that
 * is merely down must not decide where an order is cooked in either direction,
 * so a failure is a pass and never a refusal.
 */
const rms: KitchenStrategy = async (request, diagnostics, inCity) => {
  let rmsId: string | null = null;

  try {
    const adapter = await Adapter.getRMSAdapter();
    rmsId = await adapter.resolveCookingPlaceRmsId({ coordinate: request.coordinate ?? null });
  } catch (error) {
    diagnostics.push(`rms: adapter failed (${error instanceof Error ? error.message : String(error)})`);
    return PASS;
  }

  if (!rmsId) {
    diagnostics.push("rms: adapter named no terminal");
    return PASS;
  }

  const place = (await Place.find({})).find((candidate: any) => candidate?.rmsId === rmsId);
  if (!place || !isEnabledKitchen(place) || !inCity(place)) {
    diagnostics.push(`rms: terminal "${rmsId}" maps to no enabled kitchen of the city`);
    return PASS;
  }

  diagnostics.push(`rms: ${place.id} via terminal ${rmsId}`);
  return { kind: "resolved", placeId: String(place.id) };
};

/** Open kitchens of the city with a usable coordinate: what the geographic strategies choose between. */
async function openKitchensWithCoordinate(inCity: InCity): Promise<Array<{ id: string; coordinate: { lat: number; lon: number } }>> {
  const kitchens: Array<{ id: string; coordinate: { lat: number; lon: number } }> = [];
  for (const place of await Place.find({})) {
    if (!placeAcceptsOrdersNow(place) || !inCity(place)) continue;
    const at = (place as any).coordinate;
    if (!at || typeof at.lat !== "number" || typeof at.lon !== "number") continue;
    kitchens.push({ id: String(place.id), coordinate: at });
  }
  return kitchens;
}

/**
 * The kitchen whose delivery zone the customer is in.
 *
 * The delivery adapter answers, because zones are its geometry and the zone
 * that names the kitchen must be the zone that prices the delivery. No radius
 * cap here — the polygon is the boundary. Worktime is checked, as in
 * `nearest-geo`: this is choosing between kitchens.
 */
const deliveryZone: KitchenStrategy = async (request, diagnostics, inCity) => {
  const coordinate = request.coordinate;
  if (!coordinate) {
    diagnostics.push("delivery-zone: the address has no coordinate");
    return PASS;
  }

  const adapterDiagnostics: string[] = [];
  let placeId: string | null = null;
  try {
    const adapter = await Adapter.get("delivery");
    placeId = await adapter.resolvePlaceForCoordinate(coordinate, await openKitchensWithCoordinate(inCity), adapterDiagnostics);
  } catch (error) {
    diagnostics.push(`delivery-zone: delivery adapter failed (${error instanceof Error ? error.message : String(error)})`);
    return PASS;
  }
  diagnostics.push(...adapterDiagnostics.map((line) => `delivery-zone: ${line}`));

  return placeId ? { kind: "resolved", placeId } : PASS;
};

/**
 * The nearest open kitchen to the customer.
 *
 * "How far" is the delivery adapter's question, asked through `estimateTravel`
 * so that an installation with a routing adapter ranks by road and everyone
 * else by the built-in straight line. `DELIVERY_MAX_RADIUS_KM` caps the
 * adapter's kilometres; `0`, as everywhere else in these settings, means no
 * limit.
 *
 * Unlike `single-point` this one does check worktime, because it is choosing
 * between kitchens rather than describing the only one there is.
 */
const nearestGeo: KitchenStrategy = async (request, diagnostics, inCity) => {
  const coordinate = request.coordinate;
  if (!coordinate) {
    diagnostics.push("nearest-geo: the address has no coordinate");
    return PASS;
  }

  const maxRadiusKm = Number(await Settings.get("DELIVERY_MAX_RADIUS_KM")) || 0;
  const candidates: Array<{ id: string; km: number; minutes: number }> = [];

  // One try around the whole pass: an adapter that is down must not decide
  // where an order is cooked in either direction, so it passes to the next
  // strategy rather than picking from the kitchens it managed to measure.
  try {
    const adapter = await Adapter.get("delivery");

    for (const { id, coordinate: at } of await openKitchensWithCoordinate(inCity)) {
      const estimate = await adapter.estimateTravel(at, coordinate);
      if (!estimate) {
        diagnostics.push(`nearest-geo: ${id} not estimated`);
        continue;
      }
      if (maxRadiusKm > 0 && estimate.distanceKm > maxRadiusKm) continue;
      diagnostics.push(
        `nearest-geo: ${id} at ${estimate.distanceKm.toFixed(2)} km, ${estimate.travelMinutes} min (${estimate.source})`,
      );
      candidates.push({ id, km: estimate.distanceKm, minutes: estimate.travelMinutes });
    }
  } catch (error) {
    diagnostics.push(`nearest-geo: delivery adapter failed (${error instanceof Error ? error.message : String(error)})`);
    return PASS;
  }

  if (!candidates.length) {
    diagnostics.push(
      maxRadiusKm > 0
        ? `nearest-geo: no open kitchen with a coordinate within ${maxRadiusKm} km`
        : "nearest-geo: no open kitchen has a coordinate",
    );
    return PASS;
  }

  // Minutes first, then kilometres, then id. Kilometres second because the
  // built-in estimate rounds minutes up and would tie kitchens a street apart;
  // id last so the same address does not wander between two equal kitchens
  // from one recalculation to the next.
  candidates.sort((a, b) => a.minutes - b.minutes || a.km - b.km || a.id.localeCompare(b.id));
  const nearest = candidates[0];
  diagnostics.push(`nearest-geo: ${nearest.id}`);
  return { kind: "resolved", placeId: nearest.id };
};

/**
 * The kitchen of a city — or, without one, of an installation — that has exactly
 * one enabled kitchen. Needs no coordinate: with one kitchen there is nothing to
 * choose between.
 *
 * It deliberately does not check worktime. It describes the only kitchen there
 * is rather than choosing between kitchens; whether the installation takes
 * orders now is `WORK_TIME`'s question.
 */
const singlePoint: KitchenStrategy = async (_request, diagnostics, inCity) => {
  // Cast because core types these globals as possibly undefined.
  const kitchens = ((await (Place as any).find({})) as any[])
    .filter((place: any) => isEnabledKitchen(place) && inCity(place))
    .map((place: any) => String(place.id));
  if (kitchens.length !== 1) {
    diagnostics.push(`single-point: ${kitchens.length} enabled kitchens, not exactly one`);
    return PASS;
  }
  const placeId = kitchens[0];
  diagnostics.push(`single-point: ${placeId}`);
  return { kind: "resolved", placeId };
};

const strategies: Record<KitchenStrategyName, KitchenStrategy> = {
  "delivery-zone": deliveryZone,
  rms,
  "nearest-geo": nearestGeo,
  "single-point": singlePoint,
};
