import {
  AvailabilityProduct,
  ProductAvailability,
  getProductAvailability,
  getProductsAvailability,
} from "../../lib/menu/product-availability";
import {
  getDefaultCookingPlaceId,
  isEnabledKitchen,
  placeAcceptsOrdersNow,
  primaryCookingPoint,
  toPlaceId,
} from "../../lib/menu/cooking-place";
import { productFitsMaxWait } from "../../lib/order/order-timing";
import {
  KitchenResolution,
  KitchenResolveRequest,
  KitchenStrategyName,
  LinePlacement,
  MenuContext,
  MenuRequest,
  OrderDishId,
} from "../../interfaces/Menu";
import { AddressPoint } from "../../interfaces/Geo";
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
 * The context names points in the plural, and the defaults below read them as
 * a union: a product is in the menu if *any* of them can sell it. A module
 * that names two or three kitchens for one customer only has to override
 * `resolvePlaces`; the filter and the add-to-basket check already agree with
 * it. Both built-in adapters name at most one point, so nothing changes for
 * an installation running them.
 *
 * `resolveContext` and `filterProducts` are the entry points and are not meant
 * to be overridden: each wraps the adapter's own step in one that belongs to
 * the order, so every adapter gets it without writing it.
 *
 * Capability methods are plain methods with defaults, never `abstract`, the same
 * rule `DeliveryAdapter` follows: an adapter written before a method existed has
 * to keep compiling.
 */
export default abstract class MenuAdapter {
  /** Identity, and what `MENU_PLACE_BASED_MODE` resolves to. */
  public abstract readonly name: string;

  /** Which points this menu is read at, given what the caller knows. */
  protected abstract resolvePlaces(request: MenuRequest): Promise<Omit<MenuContext, "order">>;

  /** The adapter's points, and the order they were resolved for. */
  public async resolveContext(request: MenuRequest): Promise<MenuContext> {
    return { ...(await this.resolvePlaces(request)), order: request.order ?? null };
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
   * can sell it. No points means no stock is known, and nothing is dropped.
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
   * Separate from `filterSellable` because it is the same question asked with a
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
   * A routing module overrides this to plan a route, put lines on its stops and
   * read their stock there. Its `placeIds` start with the assigned kitchen, and
   * `countCart` writes the answer as given: the order's kitchens, each line's
   * stop, and the plan into the journal.
   */
  public async placeLines(
    order: OrderRecord,
    lines: { orderDishId: OrderDishId; dish: DishRecord; amount: number }[],
    context: MenuContext,
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
   * Which kitchen cooks an order.
   *
   * A chain, not a rule: an installation says in what order to ask —
   * `KITCHEN_RESOLVE_CHAIN` — and the first strategy that names a kitchen wins.
   * An empty chain, which is the default, names no kitchen at all and leaves the
   * order's `cookingPoints` empty; availability then keeps falling back to the
   * single default cooking point, exactly as it did before orders could carry one.
   *
   * The chain alone decides whether any of this runs. There is deliberately no
   * second switch next to it: `supportsZoneSync` already taught this codebase what
   * happens when one question has two answers living in different places.
   *
   * A strategy answers "which kitchen" and nothing else. It does not price
   * delivery, does not check stock and does not write to the order — resolution
   * has to be safe to run again on every address change.
   *
   * Pickup and dine-in are settled before the chain and not by it. The customer
   * already chose the point they are going to, so there is nothing left to
   * resolve, and a strategy that "decided" to cook somewhere the customer is not
   * going would be a bug rather than a fallback. It stays gated on a configured
   * chain, so an installation that never asked for kitchen resolution does not
   * quietly acquire it through the pickup form.
   *
   * A method so that an installation can choose kitchens its own way in its own
   * menu adapter; the menu before an order and the kitchen chosen for it then
   * still agree, because both ask this.
   */
  public async resolveCookingPlace(request: KitchenResolveRequest = {}): Promise<KitchenResolution> {
    const diagnostics: string[] = [];
    const chain = await kitchenResolveChain();

    if (!chain.length) {
      diagnostics.push("KITCHEN_RESOLVE_CHAIN is empty, no cooking point is assigned");
      return { placeId: null, strategy: null, diagnostics };
    }

    if (request.serviceType && request.serviceType !== "delivery") {
      const pickupPointId = toPlaceId(request.pickupPointId);
      if (!pickupPointId) {
        diagnostics.push(`pickup: ${request.serviceType} order without a chosen point`);
        return { placeId: null, strategy: null, diagnostics };
      }

      const place = await Place.findOne({ id: pickupPointId });
      if (!isEnabledKitchen(place)) {
        // A pickup point that does not cook is normal — a counter in a mall — and
        // simply means this order has no kitchen of its own.
        diagnostics.push(`pickup: ${pickupPointId} is not an enabled cooking point`);
        return { placeId: null, strategy: null, diagnostics };
      }

      diagnostics.push(`pickup: ${pickupPointId}`);
      return { placeId: pickupPointId, strategy: "pickup-point", diagnostics };
    }

    for (const name of chain) {
      try {
        const outcome = await strategies[name](request, diagnostics);
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

/** A strategy either names a kitchen or has no opinion and lets the next try. */
type StrategyOutcome =
  | { kind: "resolved"; placeId: string }
  | { kind: "pass" };

const PASS: StrategyOutcome = { kind: "pass" };

type KitchenStrategy = (
  request: KitchenResolveRequest,
  diagnostics: string[],
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
const rms: KitchenStrategy = async (request, diagnostics) => {
  let rmsId: string | null = null;

  try {
    const adapter: any = await Adapter.getRMSAdapter();
    if (!adapter || typeof adapter.resolveCookingPlaceRmsId !== "function") {
      diagnostics.push("rms: no RMS adapter that resolves kitchens");
      return PASS;
    }
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
  if (!place || !isEnabledKitchen(place)) {
    diagnostics.push(`rms: terminal "${rmsId}" maps to no enabled kitchen`);
    return PASS;
  }

  diagnostics.push(`rms: ${place.id} via terminal ${rmsId}`);
  return { kind: "resolved", placeId: String(place.id) };
};

/** Open kitchens with a usable coordinate: what the geographic strategies choose between. */
async function openKitchensWithCoordinate(): Promise<Array<{ id: string; coordinate: { lat: number; lon: number } }>> {
  const kitchens: Array<{ id: string; coordinate: { lat: number; lon: number } }> = [];
  for (const place of await Place.find({})) {
    if (!placeAcceptsOrdersNow(place)) continue;
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
const deliveryZone: KitchenStrategy = async (request, diagnostics) => {
  const coordinate = request.coordinate;
  if (!coordinate) {
    diagnostics.push("delivery-zone: the address has no coordinate");
    return PASS;
  }

  const adapterDiagnostics: string[] = [];
  let placeId: string | null = null;
  try {
    const adapter = await Adapter.getDeliveryAdapter();
    placeId = await adapter.resolvePlaceForCoordinate(coordinate, await openKitchensWithCoordinate(), adapterDiagnostics);
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
const nearestGeo: KitchenStrategy = async (request, diagnostics) => {
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
    const adapter = await Adapter.getDeliveryAdapter();

    for (const { id, coordinate: at } of await openKitchensWithCoordinate()) {
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
 * The kitchen of an installation that has exactly one.
 *
 * This is the legacy answer, and it stays the legacy answer: the same
 * `DEFAULT_COOKING_PLACE`-or-the-only-enabled-kitchen lookup the rest of the
 * application already runs, called rather than copied. Two implementations of
 * "which is the single kitchen" would only differ eventually.
 *
 * It deliberately does not check worktime. A closed kitchen answering "no
 * kitchen" here would silently turn every product unlimited, which is not what
 * closing a kitchen is supposed to mean.
 */
const singlePoint: KitchenStrategy = async (_request, diagnostics) => {
  const placeId = await getDefaultCookingPlaceId();
  if (!placeId) {
    diagnostics.push("single-point: no default cooking point and not exactly one enabled kitchen");
    return PASS;
  }
  diagnostics.push(`single-point: ${placeId}`);
  return { kind: "resolved", placeId };
};

const strategies: Record<KitchenStrategyName, KitchenStrategy> = {
  "delivery-zone": deliveryZone,
  rms,
  "nearest-geo": nearestGeo,
  "single-point": singlePoint,
};

/** The configured chain, tolerant of a setting that holds something else. */
async function kitchenResolveChain(): Promise<KitchenStrategyName[]> {
  const configured = await Settings.get("KITCHEN_RESOLVE_CHAIN");
  if (!Array.isArray(configured)) return [];

  const chain: KitchenStrategyName[] = [];
  for (const entry of configured) {
    const name = typeof entry === "string" ? entry.trim() : "";
    if (!name) continue;
    if (!Object.prototype.hasOwnProperty.call(strategies, name)) {
      sails.log.warn(`KITCHEN_RESOLVE_CHAIN contains unknown strategy "${name}", ignoring it`);
      continue;
    }
    // A repeated strategy would ask the same question twice and get the same
    // answer, so the first mention is the only one that matters.
    if (!chain.includes(name as KitchenStrategyName)) chain.push(name as KitchenStrategyName);
  }
  return chain;
}
