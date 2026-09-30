import { ServiceType } from "../models/Order";
import { ProductAvailability } from "../lib/menu/product-availability";

/**
 * What menu resolution exchanges with the rest of the application.
 *
 * Models and `lib/*` need these shapes without needing the adapter class, and
 * putting them in the class file would close a runtime require cycle rather
 * than merely a type-level one.
 *
 * The route shapes live here too. Core owns the contracts of a multi-kitchen
 * route and nothing else about routing: no implementation ships. A planner, its
 * pricing and a menu that spans several kitchens belong to a module, which
 * plugs in by overriding `MenuAdapter.placeLines` and `adjustDelivery`.
 */

/**
 * What menu resolution reads off an order.
 *
 * The whole record is passed rather than an id, which keeps the call sites
 * honest: an order that has been assigned a kitchen carries it, and nobody has
 * to remember to look it up first.
 */
export interface MenuOrder {
  id?: string;
  /** The order's kitchens; the first is the one the resolver assigned. */
  cookingPoints?: string[] | null;
  /** The customer's ceiling; a product that alone takes longer is not offered. */
  maxWaitMinutes?: number | null;
  /** How the customer gets the food: a menu for pickup is the point's menu. */
  serviceType?: ServiceType | null;
  /** The city, for a basket that has one and no kitchen yet. */
  address?: { city?: string | null } | null;
  /** A pre-order's moment: the kitchens are asked whether they are open then. */
  date?: string | null;
}

/** What the caller knows about who is asking for a menu. */
export interface MenuRequest {
  /** The order this menu is being read for, when there is one. */
  order?: MenuOrder | null;
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
  coordinate?: { lat: number; lon: number } | null;
  /**
   * Read the points whatever the hour. For what is already in a basket — its
   * recount, its display: a kitchen closing hides its menu, it does not empty
   * the baskets made from it. Checkout refuses a closed kitchen by itself.
   */
  ignoreSchedule?: boolean;
}

/**
 * `MENU_PLACE_REQUIRED` — a point was required and none could be found.
 * `PLACE_CLOSED` — every point of the menu is closed now (`Place.worktime`, or
 * switched off): nothing is offered and nothing can be added.
 */
export type MenuContextCode = "MENU_PLACE_REQUIRED" | "PLACE_CLOSED";

/** Which points a menu is read at, and how that was decided. */
export interface MenuContext {
  /**
   * The points stock is read at. A product is in the menu if any one of them
   * can sell it — the union, so an adapter that names several kitchens gets
   * the right filter from the defaults without overriding them. The exception
   * is a context without a kitchen — `city` and `all` — read as an
   * intersection (`readsEveryPoint`).
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
   * same resolver an order uses. `city` and `all` mean there is no kitchen
   * yet: the enabled kitchens of the order's city, or of every city when the
   * order names none, and a product is offered only if each of them can sell
   * it — so nothing shown before the address disappears once it is given.
   */
  source: "requested" | "order" | "coordinate" | "city" | "all" | "none";
  /**
   * The customer must name a point or an address before putting anything in a
   * basket. False in the `default` mode.
   */
  placeRequired: boolean;
  /** Why the menu cannot be offered: no point where one is required, or every point closed. */
  code?: MenuContextCode;
  /** Why the context ended up like this; for operators, never customers. */
  diagnostics: string[];
  /**
   * The order the menu is read for, as the request named it. Carried so the
   * menu answers to the order itself — `maxWaitMinutes` hides what could never
   * be ready in time — and not only to its kitchen.
   */
  order: MenuOrder | null;
}

/** The strategies `KITCHEN_RESOLVE_CHAIN` may name, in any order. */
export type KitchenStrategyName = "delivery-zone" | "rms" | "nearest-geo" | "single-point";

/** What the kitchen strategies are allowed to look at. */
export interface KitchenResolveRequest {
  /** Where the customer is, once resolved by iteration 3's rules. */
  coordinate?: { lat: number; lon: number } | null;
  /** Set on pickup and dine-in orders: the point the customer chose. */
  pickupPointId?: string | null;
  /** Defaults to delivery: a bare coordinate has no order and no service type. */
  serviceType?: ServiceType;
  /**
   * The address's city, by name or id. A delivery is cooked in it and nowhere
   * else: every strategy chooses among its kitchens only, and a city with none
   * open gives no kitchen. Without one — a bare coordinate — kitchens of every
   * city are candidates.
   */
  city?: string | null;
}

export interface KitchenResolution {
  /** `null` when no strategy in the chain could name a kitchen. */
  placeId: string | null;
  /** What produced `placeId`; `null` when nothing did. */
  strategy: KitchenStrategyName | "pickup-point" | null;
  /** Why it ended up here. For operators and logs, never for customers. */
  diagnostics: string[];
}

/**
 * How an `OrderDish` is referred to here.
 *
 * Optional because `OrderDishRecord` types its own id that way — every attribute
 * of that model is optional. A line with no id cannot be placed on a route and
 * is simply not offered one.
 */
export type OrderDishId = string | number | undefined;

/**
 * Where an order's lines are cooked, and what stock each line has there.
 *
 * `MenuAdapter.placeLines` answers it on every recalculation. The base answer is
 * one kitchen for the whole basket; a routing module answers with several.
 */
export interface LinePlacement {
  /** The order's kitchens in route order; the first is the one the resolver assigned. */
  placeIds: string[];
  /**
   * Per line: the stop that cooks it and the verdict read there. `placeId` is
   * `null` for a line cooked at the order's own kitchen, which is every line of
   * an order that is not routed.
   */
  byOrderDish: Map<OrderDishId, { placeId: string | null; availability: ProductAvailability }>;
  /** What the planner answered, for the order journal; `null` when nothing planned. */
  plan: RoutePlan | null;
}

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
