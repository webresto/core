import { OrderDishId, RoutePlan, RoutePlanRequest } from "../../adapters/menu/route-contracts";
import { primaryCookingPoint } from "../../adapters/menu/cooking-place";
import { getMenuPlaceBasedMode } from "../../adapters/menu/product-availability";

/**
 * Handing an order's lines to the kitchens of a route.
 *
 * The planner decides *what* the route is; this decides *whether the order may
 * be given one*, and writes the answer onto the lines. Same split as
 * `kitchen-assignment.ts`, and for the same reason: "which kitchen" and "may
 * this be changed" are different questions, and an order that has already been
 * placed must answer the second one with no.
 *
 * Nothing here plans anything. With no registered planner every function is a
 * no-op returning "one kitchen", which is what every installation gets.
 */

export const ROUTE_LOG = {
  planned: "countCart: route planned",
  refused: "countCart: route refused",
  cleared: "countCart: route cleared",
} as const;

export interface RouteAssignment {
  /** Kitchens in route order. Empty when there is no route. */
  placeIds: string[];
  /** `OrderDish` id to kitchen, for the lines the route places. */
  byOrderDish: Map<OrderDishId, string>;
  plan: RoutePlan | null;
  /** Set when a planner refused; the order keeps its single kitchen. */
  code?: string;
}

const NO_ROUTE: RouteAssignment = { placeIds: [], byOrderDish: new Map<OrderDishId, string>(), plan: null };

/**
 * Plans a route for an order being recalculated, when anything can plan one.
 *
 * A refusal is not a failure of the order — it means this basket cannot be
 * covered by a route, and the order stays on the single kitchen the resolver
 * already chose. That is the safe direction: one kitchen is a state the whole
 * application already understands, and every RMS can take it.
 */
export async function planOrderRoute(
  order: { id?: string; state?: string; cookingPoints?: string[] | null; maxWaitMinutes?: number | null },
  request: Omit<RoutePlanRequest, "preferredPlaceId" | "maxWaitMinutes">,
): Promise<RouteAssignment> {
  const planner = Menu.routePlanner();
  if (!planner) return NO_ROUTE;

  // A registered planner is not a permission. The routing module registers its
  // planner unconditionally and gates the feature on the menu mode, so the same
  // gate has to hold here: in any other mode the menu shows one kitchen's stock,
  // and a route that rescues a line from another kitchen keeps in the basket a
  // product the menu just said was not there.
  if ((await getMenuPlaceBasedMode()) !== "multi-place-route") return NO_ROUTE;

  // A placed order is not re-routed. Kitchens have been told what to cook and a
  // courier has a list of stops; changing either now leaves two truths in the
  // world. The plan says reassignment happens in CART and only there.
  if (Order.isOrderedState(String(order.state))) return NO_ROUTE;

  if (!request.products.length) return NO_ROUTE;

  let plan: RoutePlan;
  try {
    plan = await planner.plan({
      ...request,
      preferredPlaceId: primaryCookingPoint(order),
      maxWaitMinutes: order.maxWaitMinutes ?? null,
    });
  } catch (error) {
    // A planner that throws must not stop the recalculation: the order falls
    // back to one kitchen, which is where it already was.
    sails.log.error("Route assignment: planner failed", error);
    return NO_ROUTE;
  }

  if (plan?.code || !plan?.stops?.length) {
    return { ...NO_ROUTE, plan: plan ?? null, code: plan?.code };
  }

  const byOrderDish = new Map<OrderDishId, string>();
  for (const stop of plan.stops) {
    for (const orderDishId of stop.orderDishIds) byOrderDish.set(orderDishId, stop.placeId);
  }

  return {
    placeIds: plan.stops.map((stop) => stop.placeId),
    byOrderDish,
    plan,
  };
}
