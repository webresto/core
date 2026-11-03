import ORM from "../interfaces/ORM";
import { ORMModel } from "../interfaces/ORMModel";
import { OrderRecord } from "./Order";
import { PlaceRecord } from "./Place";
/**
 * A stop of an order: one point that has work to do for it (plan C2).
 *
 * The row exists so that "the orders of this point" is a query by an index and not a read of the
 * whole chain filtered in memory: `Order` has no column naming the point it is led by — a delivery
 * keeps its kitchens in a json list, and pickup keeps the point the customer chose.
 *
 * Самовывоз и зал — одна остановка в выбранной точке; доставка — по одной на каждую кухню
 * `cookingPoints`, в порядке маршрута; доставка, для которой кухня ещё не определена, — одна
 * остановка с `place: null`, и это «Без кухни» мобильного приложения и доски. Корзины остановок не
 * имеют вовсе: маршрут решается при оформлении.
 *
 * Everything on the row besides `order`, `place` and `position` is a copy kept for selection:
 * `orderState`, `orderedAt` and `completedAt` are the order's, written by `syncOrderStops` at every
 * transition. Nothing reads a copy to decide anything — the order itself is the truth.
 */
declare let attributes: {
    id: string;
    order: OrderRecord | string;
    /**
     * The point with work to do; `null` — no kitchen has been resolved for this delivery yet.
     *
     * No `allowNull`: Waterline refuses the flag on an association and lets a singular one be null
     * by default, which is exactly the «Без кухни» row.
     */
    place: PlaceRecord | string | null;
    /** 0 — the leading stop; a courier's route appends 1, 2, … in driving order. */
    position: number;
    /**
     * The state of this stop's own part of the order — `QUEUED → COOKING → READY → PICKED_UP` of
     * assembly orders (C3). `null` while nothing routes an order over more than one kitchen.
     */
    partState: string | null;
    /** When this part has to be ready, epoch milliseconds; filled from a route plan (C3). */
    readyBy: number | null;
    /** Copy of `Order.state`, so a point's board is one indexed query. */
    orderState: string;
    /** Copy of `Order.orderedAt`, epoch seconds. */
    orderedAt: number | null;
    /** Copy of `Order.completedAt`, epoch seconds. */
    completedAt: number | null;
    createdAt: number;
    updatedAt: number;
};
type attributes = typeof attributes;
export interface OrderStopRecord extends Omit<attributes, "createdAt" | "updatedAt">, ORM {
}
declare let Model: {
    beforeCreate(record: OrderStopRecord, cb: (err?: string) => void): Promise<void>;
};
declare global {
    const OrderStop: typeof Model & ORMModel<OrderStopRecord, "order" | "place">;
}
export {};
