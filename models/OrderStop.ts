import ORM from "../interfaces/ORM";
import { ORMModel } from "../interfaces/ORMModel";
import { v4 as uuid } from "uuid";
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

let attributes = {
  id: {
    type: "string",
  } as unknown as string,

  order: {
    model: "order",
    required: true,
  } as unknown as OrderRecord | string,

  /**
   * The point with work to do; `null` — no kitchen has been resolved for this delivery yet.
   *
   * No `allowNull`: Waterline refuses the flag on an association and lets a singular one be null
   * by default, which is exactly the «Без кухни» row.
   */
  place: {
    model: "place",
  } as unknown as PlaceRecord | string | null,

  /** 0 — the leading stop; a courier's route appends 1, 2, … in driving order. */
  position: {
    type: "number",
    defaultsTo: 0,
  } as unknown as number,

  /**
   * The state of this stop's own part of the order — `QUEUED → COOKING → READY → PICKED_UP` of
   * assembly orders (C3). `null` while nothing routes an order over more than one kitchen.
   */
  partState: {
    type: "string",
    allowNull: true,
  } as unknown as string | null,

  /** When this part has to be ready, epoch milliseconds; filled from a route plan (C3). */
  readyBy: {
    type: "number",
    allowNull: true,
  } as unknown as number | null,

  /** Copy of `Order.state`, so a point's board is one indexed query. */
  orderState: {
    type: "string",
    required: true,
  } as unknown as string,

  /** Copy of `Order.orderedAt`, epoch seconds. */
  orderedAt: {
    type: "number",
    allowNull: true,
  } as unknown as number | null,

  /** Copy of `Order.completedAt`, epoch seconds. */
  completedAt: {
    type: "number",
    allowNull: true,
  } as unknown as number | null,

  createdAt: {
    type: "number",
    autoCreatedAt: true,
  } as unknown as number,

  updatedAt: {
    type: "number",
    autoUpdatedAt: true,
  } as unknown as number,
};

type attributes = typeof attributes;
export interface OrderStopRecord extends Omit<attributes, "createdAt" | "updatedAt">, ORM {}

let Model = {
  async beforeCreate(record: OrderStopRecord, cb: (err?: string) => void) {
    if (!record.id) record.id = uuid();
    cb();
  },
};

module.exports = {
  primaryKey: "id",
  tableName: "order_stop",
  attributes,
  ...Model,
};

declare global {
  const OrderStop: typeof Model & ORMModel<OrderStopRecord, "order" | "place">;
}
