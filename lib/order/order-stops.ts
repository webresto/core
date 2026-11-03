import { OrderRecord } from "../../models/Order";
import { OrderStopRecord } from "../../models/OrderStop";
import { toPlaceId } from "../menu/cooking-place";
import { ORDER_COMPLETED_STATES, isPreOrderFilteredState } from "./OrderStateFlow";
import { ACTIVE_ORDER_STATES } from "./orders-of-place";

/**
 * Keeping the stops of an order in step with the order (plan C2).
 *
 * One function writes them, and every path that writes `Order.state` goes through it — `Order.next`
 * (and `doFinalize` through it), `Order.order`, `assignOrderKitchen`. An architecture test holds
 * that rule, because a path that forgets the call makes an order vanish from its point's board.
 *
 * What the stops are is decided here and nowhere else:
 *   - a basket (NEW, CART, CHECKOUT, PAYMENT) has none — the route is decided when it is placed;
 *   - pickup and dine-in have one, at the point the customer chose;
 *   - a delivery has one per kitchen of `cookingPoints`, in driving order;
 *   - a delivery with no kitchen resolved has one with `place: null` — «Без кухни».
 */

/** What a stop should be, before it is written. */
interface WantedStop {
  place: string | null;
  position: number;
}

function wantedStops(order: Partial<OrderRecord>): WantedStop[] {
  if (isPreOrderFilteredState(order.state)) return [];
  if (order.serviceType && order.serviceType !== "delivery") {
    return [{ place: toPlaceId(order.pickupPoint), position: 0 }];
  }
  const kitchens = (order.cookingPoints ?? []).map(toPlaceId).filter((id): id is string => Boolean(id));
  if (!kitchens.length) return [{ place: null, position: 0 }];
  return kitchens.map((place, position) => ({ place, position }));
}

/** The copies every stop of this order carries, so a point's board is one indexed query. */
function copies(order: Partial<OrderRecord>) {
  return {
    orderState: order.state ?? "NEW",
    orderedAt: order.orderedAt ?? null,
    completedAt: order.completedAt ?? null,
  };
}

/**
 * Writes the stops of one order and removes the ones that no longer apply. Answers with the stops
 * the order now has.
 *
 * Never throws into the caller's transition: a board that lags one order behind is a great deal
 * better than a transition that fails because of its index.
 */
export async function syncOrderStops(criteria: string | { id: string }): Promise<OrderStopRecord[]> {
  const id = typeof criteria === "string" ? criteria : criteria.id;
  try {
    const order: OrderRecord | undefined = await Order.findOne!({ id });
    if (!order) return [];

    const wanted = wantedStops(order);
    const existing: OrderStopRecord[] = await OrderStop.find!({ where: { order: id } });
    const extra = existing.filter((stop) => !wanted.some((want) => sameStop(stop, want)));
    if (extra.length) await OrderStop.destroy!({ id: extra.map((stop) => stop.id) }).fetch();

    const result: OrderStopRecord[] = [];
    for (const want of wanted) {
      const kept = existing.find((stop) => sameStop(stop, want));
      result.push(kept
        ? await OrderStop.updateOne!({ id: kept.id }, copies(order))
        : (await OrderStop.create!({ order: id, place: want.place, position: want.position, ...copies(order) }).fetch()));
    }
    return result;
  } catch (error) {
    sails.log.error(`Order stops of [${id}] were not written`, error);
    return [];
  }
}

function sameStop(stop: OrderStopRecord, want: WantedStop): boolean {
  return toPlaceId(stop.place) === want.place && Number(stop.position) === want.position;
}

/**
 * Stops for the orders that have none — the backfill of C2, run once at boot in the primary worker.
 *
 * Only the orders a point's board can ask about: the active ones, and those completed within the
 * last `days` (30, as the plan asks — wider than the 7 days the «Завершённые» tab shows). An
 * installation upgrading into this model has no stops at all, and a board without them opens empty.
 */
export async function backfillOrderStops({ days = 30, now = Date.now() } = {}): Promise<number> {
  const seconds = (moment: number) => Math.floor(moment / 1000);
  const [active, completed] = await Promise.all([
    // No `select`: Waterline refuses one while the models are `schema: false`.
    Order.find!({ where: { state: { in: ACTIVE_ORDER_STATES } } } as any),
    Order.find!({
      where: { state: { in: ORDER_COMPLETED_STATES }, completedAt: { ">=": seconds(now - days * 24 * 60 * 60 * 1000) } },
    } as any),
  ]);

  let written = 0;
  for (const order of [...active, ...completed]) {
    if ((await OrderStop.count!({ order: order.id })) > 0) continue;
    if ((await syncOrderStops({ id: order.id as string })).length) written += 1;
  }
  return written;
}
