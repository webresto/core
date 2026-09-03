/**
 * What a multi-kitchen route is, as far as core is concerned.
 *
 * Core owns these shapes and nothing else about routing. The plan is explicit:
 * the planner, the pricing strategies and the menu that spans several kitchens
 * live in a module, and core keeps only the contracts they agree on. That split
 * is what lets an installation that will never route across kitchens carry none
 * of the machinery for it.
 *
 * A leaf file, like the other contract files here: models and `lib/*` need these
 * shapes without needing the module that produces them.
 */

/**
 * How an `OrderDish` is referred to here.
 *
 * Optional because `OrderDishRecord` types its own id that way — every attribute
 * of that model is optional. A line with no id cannot be placed on a route and
 * is simply not offered one.
 */
export type OrderDishId = string | number | undefined;

/** One stop of a route: a kitchen and the lines it is cooking. */
export interface RouteStop {
  placeId: string;
  /** `OrderDish` ids assigned to this stop. */
  orderDishIds: OrderDishId[];
  /** Minutes this stop needs, from the cooking times of its own lines. */
  preparationMinutes: number;
  /** Minutes from the previous stop, or from nothing for the first one. */
  travelMinutesFromPrevious: number;
}

export type RouteRefusalCode =
  /** No single set of kitchens covers the basket. */
  | "ROUTE_NO_COVERAGE"
  /** A covering set exists but does not fit the time the customer will accept. */
  | "ROUTE_OVER_BUDGET"
  /** More stops than the installation allows. */
  | "ROUTE_TOO_MANY_STOPS";

/**
 * A planned route, or a refusal with a reason.
 *
 * Refusal is a first-class outcome for the same reason it is in the kitchen
 * resolver: "no route" and "a route nobody would wait for" are different facts,
 * and collapsing them lets a caller substitute something arbitrary. A planner
 * that cannot answer returns a code, never a shorter route it invented.
 */
export interface RoutePlan {
  stops: RouteStop[];
  /** Cooking and travel across the whole route, plus the customer leg. */
  totalMinutes: number;
  code?: RouteRefusalCode;
  /** Why the plan looks like this; for operators, never customers. */
  diagnostics: string[];
}

export interface RoutePlanRequest {
  /** Basket lines to place. Products of type `dish` carry the cooking time. */
  products: {
    orderDishId: OrderDishId;
    productId: string;
    amount: number;
    type?: string | null;
    cookingTimeMax?: number | null;
  }[];
  /** Where the customer is. Without it there is no route to plan. */
  customer: { lat: number; lng: number } | null;
  /** The kitchen the zone or the chain already chose, when there is one. */
  preferredPlaceId?: string | null;
  /** The ceiling the customer stated, in minutes; `null` means none. */
  maxWaitMinutes?: number | null;
}

/**
 * Planning a route across kitchens.
 *
 * Deliberately not a method on `MenuAdapter` or `DeliveryAdapter`. Both of those
 * answer questions about one order at one point; a route is a third question,
 * and a module that implements it has to be able to say "no route" without that
 * meaning "no menu" or "no delivery".
 */
export interface RoutePlanner {
  readonly name: string;
  plan(request: RoutePlanRequest): Promise<RoutePlan>;
}
