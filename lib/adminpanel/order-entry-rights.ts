/**
 * The points an order may be taken for (plan C9 of `order-entry.plan.md`).
 *
 * `order-entry` is the right to take an order — the POS of the mobile app, and whatever surface
 * takes orders next. Contextual, as `stock-manager` and `order-kanban` are: the group picks the
 * points its people may take orders for, and the token alone only opens the screen, so somebody
 * without points is told to ask for one instead of meeting a blank 403.
 *
 * The options are the enabled cooking points: the menu of an order is read at a kitchen, and an
 * order taken for a point that cannot cook has nowhere to go. Whether that point also hands food
 * over (`isPickupPoint`) or has a room to eat in (`hasDiningArea`) decides which service types the
 * screen offers, not whether an order can be taken there at all.
 */

export const ORDER_ENTRY_TOKEN = "order-entry";

export async function orderEntryOptions(): Promise<Array<{ id: string; name: string; description?: string }>> {
  const places = await Place.find!({ where: { isCookingPoint: true, enable: true }, sort: "title ASC" });
  return places.map((place: any) => ({
    id: String(place.id),
    name: place.title || String(place.id),
    description: place.address || undefined,
  }));
}

/** A token alone opens the screen; every order carries a concrete point, and that is what is checked. */
export function checkOrderEntryToken(_user: unknown, context?: { rights?: string[]; placeId?: unknown }): boolean {
  if (!context?.placeId) return true;
  return Array.isArray(context.rights) && context.rights.includes(String(context.placeId));
}
