import { WorkTimeValidator } from "@webresto/worktime";
import type { MenuContext } from "../../interfaces/Menu";

/**
 * Which cooking point a question is being asked about.
 *
 * An order is cooked at the first of `Order.cookingPoints`, filled in by the
 * kitchen resolver. There is no installation-wide default kitchen: an order
 * without one is read at the kitchens it could still end up at — its city's,
 * or every city's — and a product counts only where each of them has it
 * (`readsEveryPoint`).
 */

/** An association can arrive populated or as a bare id. */
export function toPlaceId(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "object" && "id" in (value as any)) {
    const id = (value as any).id;
    return id ? String(id) : null;
  }
  return null;
}

/**
 * The kitchen the resolver assigned to this order.
 *
 * Always the first of `cookingPoints`: a route appends the kitchens it adds and
 * never reorders the list. `null` while the list is empty.
 */
export function primaryCookingPoint(
  order: { cookingPoints?: string[] | null } | null | undefined,
): string | null {
  return toPlaceId(order?.cookingPoints?.[0]);
}

/**
 * The kitchens a courier collects a routed order from, in driving order — the
 * assigned kitchen first. Empty unless the order is a delivery spread over more
 * than one kitchen: pickup and dine-in are one point, and so is an unrouted
 * delivery.
 */
export function courierRoute(
  order: { serviceType?: string | null; cookingPoints?: string[] | null } | null | undefined,
): string[] {
  if (order?.serviceType !== "delivery") return [];
  const ids = (order.cookingPoints ?? []).map(toPlaceId).filter((id): id is string => Boolean(id));
  return ids.length > 1 ? ids : [];
}

/**
 * The point a menu request names by itself: the one the caller asked for, else
 * the order's kitchen. `null` when it names none and the menu has to decide.
 *
 * The caller's point wins: a customer browsing "what can I get from the north
 * kitchen" is asking a question the order cannot answer.
 */
export function namedMenuPoint(
  request: { cookingPointId?: string | null; order?: { cookingPoints?: string[] | null } | null } | null | undefined,
): { placeId: string; source: "requested" | "order" } | null {
  const requested = toPlaceId(request?.cookingPointId);
  if (requested) return { placeId: requested, source: "requested" };

  const assigned = primaryCookingPoint(request?.order);
  if (assigned) return { placeId: assigned, source: "order" };

  return null;
}

/** A point that can cook right now — as a matter of configuration, not schedule. */
export function isEnabledKitchen(place: any): boolean {
  return place?.isCookingPoint === true && place?.enable !== false;
}

/**
 * Whether the point is open at a moment — by default, this one.
 *
 * Says nothing about kitchens: a counter that only hands orders over closes and
 * opens like any other point, and that is exactly what pickup and dine-in ask.
 *
 * `at` exists because a pre-order is not asking about now. An order for tomorrow
 * noon must be judged against tomorrow noon, and the clock's answer today would
 * refuse or accept it for the wrong reason.
 *
 * A point with no schedule is treated as always open, which is how zones with
 * no `worktime` already behave.
 */
export function placeIsOpen(place: any, at?: Date): boolean {
  if (!place || place.enable === false) return false;
  if (!place.worktime || !place.worktime.length) return true;

  try {
    return WorkTimeValidator.isWorkNow({ worktime: place.worktime } as any, at).workNow !== false;
  } catch {
    // The validator throws rather than answering when the schedule says nothing
    // about today — a point that works Monday to Friday, asked on a Sunday.
    // That is a closed point, not a broken one. A point with no schedule at
    // all never reaches this line.
    return false;
  }
}

/**
 * Whether the point can cook at a moment.
 *
 * Kept apart from `isEnabledKitchen`: "switched off" is an operator's lasting
 * decision, "closed right now" passes on its own. Callers that must not change
 * behaviour with the clock — stock lookups, for one — ask only the first.
 */
export function placeAcceptsOrdersNow(place: any, at?: Date): boolean {
  return isEnabledKitchen(place) && placeIsOpen(place, at);
}

/**
 * Enabled kitchens of the city an order's address names, when the order has no
 * kitchen of its own — a customer who picked a city and has no kitchen yet.
 * Read as an intersection (`readsEveryPoint`).
 *
 * `OrderAddress.city` carries the city's name (the geocoder reads it as text),
 * `Place.city` its id, so the city is looked up by either. No clock, like every
 * stock lookup.
 */
export async function getOrderCityKitchenIds(
  order: { address?: { city?: string | null } | null } | null | undefined,
): Promise<string[]> {
  const named = typeof order?.address?.city === "string" ? order.address.city.trim() : "";
  if (!named) return [];

  // Cast because core types these globals as possibly undefined; the ORM is up
  // long before a menu is read.
  const city = ((await (City as any).find({})) as any[]).find((row) => row.id === named || row.name === named);
  if (!city) return [];

  return ((await (Place as any).find({})) as any[])
    .filter((place: any) => isEnabledKitchen(place) && toPlaceId(place.city) === String(city.id))
    .map((place: any) => String(place.id));
}

/**
 * Every enabled cooking point: what a menu with no city and no kitchen is read
 * at, and what an RMS snapshot without terminals covers.
 */
export async function getEnabledCookingPlaceIds(): Promise<string[]> {
  return (await Place.find({})).filter(isEnabledKitchen).map((place: any) => String(place.id));
}

/**
 * Whether a context's points are read as an intersection: a product counts
 * only if each of them can sell it.
 *
 * True where the order has no kitchen yet — `city` and `all`. Whichever of
 * those kitchens the address later picks, what was shown there is still on
 * offer. Every other context names the kitchens that will cook, and reads them
 * as a union.
 */
export function readsEveryPoint(context: Pick<MenuContext, "source">): boolean {
  return context.source === "city" || context.source === "all";
}
