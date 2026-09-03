import {
  getDefaultCookingPlaceId,
  isEnabledKitchen,
  placeAcceptsOrdersNow,
  toPlaceId,
} from "./cooking-place";

/**
 * Which kitchen cooks an order.
 *
 * The resolver is a chain, not a rule: an installation says in what order to ask
 * — `KITCHEN_RESOLVE_CHAIN` — and the first strategy that names a kitchen wins.
 * An empty chain, which is the default, names no kitchen at all and leaves the
 * order's `cookingPoint` null; availability then keeps falling back to the
 * single default cooking point, exactly as it did before orders could carry one.
 *
 * The chain alone decides whether any of this runs. There is deliberately no
 * second switch next to it: `supportsZoneSync` already taught this codebase what
 * happens when one question has two answers living in different places.
 *
 * A strategy answers "which kitchen" and nothing else. It does not price
 * delivery, does not check stock and does not write to the order — resolution
 * has to be safe to run again on every address change.
 */

export const KITCHEN_STRATEGY_NAMES = [
  "delivery-zone",
  "rms",
  "nearest-geo",
  "single-point",
] as const;

export type KitchenStrategyName = (typeof KITCHEN_STRATEGY_NAMES)[number];

/** What the strategies are allowed to look at. */
export interface KitchenResolveContext {
  /** Where the customer is, once resolved by iteration 3's rules. */
  coordinate?: { lat: number; lng: number } | null;
  /** Set on pickup orders: the point the customer chose to collect from. */
  pickupPointId?: string | null;
  selfService?: boolean;
}

export interface KitchenResolution {
  /** `null` when no strategy in the chain could name a kitchen. */
  placeId: string | null;
  /** What produced `placeId`; `null` when nothing did. */
  strategy: KitchenStrategyName | "pickup-point" | null;
  /** Why it ended up here. For operators and logs, never for customers. */
  diagnostics: string[];
}

/** A strategy either names a kitchen or has no opinion and lets the next try. */
type StrategyOutcome =
  | { kind: "resolved"; placeId: string }
  | { kind: "pass" };

const PASS: StrategyOutcome = { kind: "pass" };

type KitchenStrategy = (
  context: KitchenResolveContext,
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
const rms: KitchenStrategy = async (context, diagnostics) => {
  let rmsId: string | null = null;

  try {
    const adapter: any = await Adapter.getRMSAdapter();
    if (!adapter || typeof adapter.resolveCookingPlaceRmsId !== "function") {
      diagnostics.push("rms: no RMS adapter that resolves kitchens");
      return PASS;
    }
    rmsId = await adapter.resolveCookingPlaceRmsId({ coordinate: context.coordinate ?? null });
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
async function openKitchensWithCoordinate(): Promise<Array<{ id: string; coordinate: { lat: number; lng: number } }>> {
  const kitchens: Array<{ id: string; coordinate: { lat: number; lng: number } }> = [];
  for (const place of await Place.find({})) {
    if (!placeAcceptsOrdersNow(place)) continue;
    const at = (place as any).coordinate;
    if (!at || typeof at.lat !== "number" || typeof at.lng !== "number") continue;
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
const deliveryZone: KitchenStrategy = async (context, diagnostics) => {
  const coordinate = context.coordinate;
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
const nearestGeo: KitchenStrategy = async (context, diagnostics) => {
  const coordinate = context.coordinate;
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
const singlePoint: KitchenStrategy = async (_context, diagnostics) => {
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
export async function getKitchenResolveChain(): Promise<KitchenStrategyName[]> {
  const configured = await Settings.get("KITCHEN_RESOLVE_CHAIN");
  if (!Array.isArray(configured)) return [];

  const chain: KitchenStrategyName[] = [];
  for (const entry of configured) {
    const name = typeof entry === "string" ? entry.trim() : "";
    if (!name) continue;
    if (!(KITCHEN_STRATEGY_NAMES as readonly string[]).includes(name)) {
      sails.log.warn(`KITCHEN_RESOLVE_CHAIN contains unknown strategy "${name}", ignoring it`);
      continue;
    }
    // A repeated strategy would ask the same question twice and get the same
    // answer, so the first mention is the only one that matters.
    if (!chain.includes(name as KitchenStrategyName)) chain.push(name as KitchenStrategyName);
  }
  return chain;
}

/**
 * Asks the configured chain, in order, until one strategy names a kitchen.
 *
 * Pickup is settled before the chain and not by it. The customer already chose
 * the point they will collect from, so there is nothing left to resolve, and a
 * strategy that "decided" to cook somewhere the customer is not going would be a
 * bug rather than a fallback. It stays gated on a configured chain, so an
 * installation that never asked for kitchen resolution does not quietly acquire
 * it through the pickup form.
 */
export async function resolveCookingPlace(
  context: KitchenResolveContext = {},
): Promise<KitchenResolution> {
  const diagnostics: string[] = [];
  const chain = await getKitchenResolveChain();

  if (!chain.length) {
    diagnostics.push("KITCHEN_RESOLVE_CHAIN is empty, no cooking point is assigned");
    return { placeId: null, strategy: null, diagnostics };
  }

  if (context.selfService) {
    const pickupPointId = toPlaceId(context.pickupPointId);
    if (!pickupPointId) {
      diagnostics.push("pickup: self-service order without a chosen point");
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
      const outcome = await strategies[name](context, diagnostics);
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

/**
 * The kitchen for a bare coordinate, with no order in sight.
 *
 * The storefront asks for a menu before a basket exists, and the only thing it
 * knows is where the customer is. The answer has to be the same one the order
 * will get later, so this runs the same chain rather than a second
 * implementation of "nearest".
 *
 * `null` when there is no coordinate, when the chain is not configured, or when
 * nothing was chosen — the caller then falls back to `DEFAULT_COOKING_PLACE`,
 * which is what a customer who has typed no address has always been shown.
 */
export async function resolveCookingPlaceForCoordinate(
  coordinate: { lat: number; lng: number } | null | undefined,
): Promise<{ placeId: string; diagnostics: string[] } | null> {
  if (!coordinate) return null;

  const resolution = await resolveCookingPlace({ coordinate });

  return resolution.placeId
    ? { placeId: resolution.placeId, diagnostics: resolution.diagnostics }
    : null;
}
