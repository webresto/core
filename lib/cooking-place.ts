import { WorkTimeValidator } from "@webresto/worktime";

/**
 * Which cooking point a question is being asked about.
 *
 * There are two different questions here and they used to be one, because on an
 * installation with a single kitchen they have the same answer:
 *
 * - *which point does this installation calculate availability at* — the
 *   `DEFAULT_COOKING_PLACE` setting, or the only enabled kitchen. This is the
 *   legacy answer and it stays the fallback everywhere;
 * - *which point cooks this order* — `Order.cookingPoint`, filled in by the
 *   kitchen resolver, `null` until a resolver chain is configured.
 *
 * `getOrderCookingPlaceId()` is the bridge: an order that has been assigned a
 * kitchen is served from it, and one that has not falls back to the default, so
 * an installation that never configures a chain behaves exactly as before.
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

/** A point that can cook right now — as a matter of configuration, not schedule. */
export function isEnabledKitchen(place: any): boolean {
  return place?.isCookingPoint === true && place?.enable !== false;
}

/**
 * Whether the point is open at a moment — by default, this one.
 *
 * Kept apart from `isEnabledKitchen`: "switched off" is an operator's lasting
 * decision, "closed right now" passes on its own. Callers that must not change
 * behaviour with the clock — stock lookups, for one — ask only the first.
 *
 * `at` exists because a pre-order is not asking about now. An order for tomorrow
 * noon must be judged against tomorrow noon, and the clock's answer today would
 * refuse or accept it for the wrong reason.
 *
 * A point with no schedule is treated as always open, which is how zones with
 * no `worktime` already behave.
 */
export function placeAcceptsOrdersNow(place: any, at?: Date): boolean {
  if (!isEnabledKitchen(place)) return false;
  if (!place?.worktime || !place.worktime.length) return true;

  try {
    return WorkTimeValidator.isWorkNow({ worktime: place.worktime } as any, at).workNow !== false;
  } catch {
    // The validator throws rather than answering when the schedule says nothing
    // about today — a kitchen that works Monday to Friday, asked on a Sunday.
    // That is a closed kitchen, not a broken one. A point with no schedule at
    // all never reaches this line.
    return false;
  }
}

export async function getDefaultCookingPlaceId(): Promise<string | null> {
  const configured = await Settings.get("DEFAULT_COOKING_PLACE");
  const configuredId = typeof configured === "string" ? configured.trim() : "";

  if (configuredId) {
    const place = await Place.findOne({ id: configuredId });
    if (isEnabledKitchen(place)) return String(place.id);
    sails.log.warn(
      `DEFAULT_COOKING_PLACE "${configuredId}" is not an enabled cooking point, ` +
      `falling back to the only enabled kitchen`,
    );
  }

  const kitchens = (await Place.find({})).filter(isEnabledKitchen);
  if (kitchens.length === 1) return String(kitchens[0].id);
  return null;
}

/** Every enabled cooking point. An RMS snapshot without terminals covers all of them. */
export async function getEnabledCookingPlaceIds(): Promise<string[]> {
  return (await Place.find({})).filter(isEnabledKitchen).map((place: any) => String(place.id));
}

/**
 * The point this order's stock and availability are read at.
 *
 * Only the order's own kitchen and the installation default, in that order —
 * deliberately no worktime check. A kitchen that closed at 23:00 must not make
 * the basket of an order already assigned to it read as unlimited.
 */
export async function getOrderCookingPlaceId(
  order: { cookingPoint?: unknown } | null | undefined,
): Promise<string | null> {
  const assigned = toPlaceId(order?.cookingPoint);
  if (assigned) return assigned;
  return getDefaultCookingPlaceId();
}
