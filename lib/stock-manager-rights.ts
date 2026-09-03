/**
 * A token alone permits opening Stock Manager so an operator can be told that
 * points are missing. Stock data always carries a concrete placeId.
 */
export function checkStockManagerToken(_user: unknown, context?: { rights?: string[]; placeId?: unknown }): boolean {
  if (!context?.placeId) return true;
  return Array.isArray(context.rights) && context.rights.includes(String(context.placeId));
}

