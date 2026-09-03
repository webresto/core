/**
 * What menu resolution exchanges with the rest of the application.
 *
 * A leaf file, like `delivery/contracts.ts` and for the same reason: models and
 * `lib/*` need these shapes without needing the adapter class, and putting them
 * in the class file would close a runtime require cycle rather than merely a
 * type-level one.
 */

/** What the caller knows about who is asking for a menu. */
export interface MenuRequest {
  /**
   * The order this menu is being read for, when there is one.
   *
   * Only `cookingPoint` is read. Taking the whole record rather than an id keeps
   * the call sites honest: an order that has been assigned a kitchen carries it,
   * and nobody has to remember to look it up first.
   */
  order?: { id?: string; cookingPoint?: unknown } | null;
  /**
   * A point named by the caller — the `cookingPointId` API parameter.
   *
   * Wins over the order's own point. A customer browsing "what can I get from
   * the north kitchen" is asking a question the order cannot answer.
   */
  cookingPointId?: string | null;
  /**
   * Where the customer is, before there is an order.
   *
   * The storefront asks for a menu long before a basket exists, and the only
   * thing it knows is the coordinate. With one, the kitchen is chosen the same
   * way an order's is — the same `KITCHEN_RESOLVE_CHAIN` of strategies — so the
   * menu shown is the menu the order will be cooked from.
   *
   * Loses to `cookingPointId` and to the order, both of which are answers rather
   * than inputs to a decision.
   */
  coordinate?: { lat: number; lng: number } | null;
}

export type MenuContextCode = "MENU_PLACE_REQUIRED";

/** Which points a menu is read at, and how that was decided. */
export interface MenuContext {
  /**
   * The points stock is read at. A product is in the menu if any one of them
   * can sell it — the union, so an adapter that names several kitchens gets
   * the right filter from the defaults without overriding them. The built-in
   * adapters name at most one.
   *
   * Empty means no point is known, which reads as unlimited stock — the legacy
   * answer, and the one an installation with no cooking point configured has
   * always got — unless `placeRequired`, where it is a refusal.
   */
  placeIds: string[];
  /**
   * Which input decided it.
   *
   * `coordinate` means it was derived from where the customer is, through the
   * same resolver an order uses.
   */
  source: "requested" | "order" | "coordinate" | "default" | "none";
  /**
   * The customer must name a point or an address before putting anything in a
   * basket. False in the legacy mode, where the menu is global.
   */
  placeRequired: boolean;
  /** Set when a point was required and none could be found. */
  code?: MenuContextCode;
  /** Why the context ended up like this; for operators, never customers. */
  diagnostics: string[];
}
