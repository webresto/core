import { NO_KITCHEN } from "../order/orders-of-place";

/**
 * The points of the orders board (plan C1).
 *
 * `order-kanban` becomes contextual, as `stock-manager` is: the group picks the points whose orders
 * it may see, and the token alone only opens the page — so an operator with no points gets the board
 * and a line telling them to ask for one, not a blank 403.
 *
 * The options are every enabled point an order can be led by — a kitchen or a point the customer
 * collects from — plus «Без кухни» ({@link NO_KITCHEN}), the orders no kitchen was resolved for.
 * That last one is an option and not a `Place`: it is the absence of one, and whoever holds it is
 * the person expected to hand those orders a kitchen.
 */

/** The option behind «Без кухни»; the same id the selection of orders uses. */
export { NO_KITCHEN };

export const ORDER_KANBAN_TOKEN = "order-kanban";

/** Title shown in the group form and in the point switch. Translated by the panel's i18n. */
export const NO_KITCHEN_TITLE = "Without kitchen";

export async function orderKanbanOptions(): Promise<Array<{ id: string; name: string; description?: string }>> {
  const places = await Place.find!({ where: { enable: true, or: [{ isCookingPoint: true }, { isPickupPoint: true }] }, sort: "title ASC" });
  return [
    ...places.map((place: any) => ({
      id: String(place.id),
      name: place.title || String(place.id),
      description: place.address || undefined,
    })),
    { id: NO_KITCHEN, name: NO_KITCHEN_TITLE, description: "Orders no kitchen has been resolved for" },
  ];
}

/**
 * A token alone permits opening the board, as for Stock Manager: orders always carry a concrete
 * point, and that is what the options are checked against.
 */
export function checkOrderKanbanToken(_user: unknown, context?: { rights?: string[]; placeId?: unknown }): boolean {
  if (!context?.placeId) return true;
  return Array.isArray(context.rights) && context.rights.includes(String(context.placeId));
}
