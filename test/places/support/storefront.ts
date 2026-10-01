import { OrderRecord } from "../../../models/Order";

/**
 * What the storefront does to a basket, in the order the GraphQL resolvers do
 * it, so a test reads as a customer's steps rather than as model calls.
 */

export const CUSTOMER = { name: "Customer 1", phone: { code: "+1", number: "5550000001" } } as any;

/** A fresh basket, as the storefront creates it on first load. */
export async function newBasket(values: Partial<OrderRecord> = {}): Promise<string> {
  const order = await Order.create({ ...values }).fetch();
  return order.id;
}

/**
 * `orderUpdate`: write the fields, send the basket back to CART, recount.
 * Returns the order as it is after that.
 *
 * A basket nothing was added to yet is still NEW, and core does not recount a
 * NEW one; the resolver's recount there only logs a refusal, so it is skipped.
 */
export async function updateOrder(id: string, values: Record<string, unknown>): Promise<OrderRecord> {
  await Order.update({ id }, values).fetch();
  if ((await Order.findOne({ id })).state !== "NEW") {
    await Order.next({ id }, "CART");
    await Order.countCart({ id });
  }
  return Order.findOne({ id });
}

export function deliverTo(id: string, address: Record<string, unknown>): Promise<OrderRecord> {
  return updateOrder(id, { serviceType: "delivery", address, pickupPoint: null });
}

export function pickUpAt(id: string, pointId: string, serviceType: "pickup" | "dine-in" = "pickup"): Promise<OrderRecord> {
  return updateOrder(id, { serviceType, pickupPoint: pointId });
}

export function add(id: string, dishId: string, amount = 1): Promise<void> {
  return Order.addDish({ id }, dishId, amount, [], "", "user");
}

/** `checkout`: the order's own address and service type, as the storefront sends them. */
export async function checkout(id: string): Promise<void> {
  const order = await Order.findOne({ id });
  return Order.check({ id }, CUSTOMER, order.serviceType, order.address ?? undefined);
}

/** `{ dishName: amount }` of the basket's lines. */
export async function lines(id: string): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  for (const line of await OrderDish.find({ order: id }).populate("dish")) {
    const name = (line.dish as any).name;
    out[name] = (out[name] ?? 0) + line.amount;
  }
  return out;
}

/** What an awaited call threw, or `null`. */
export async function thrown(promise: Promise<unknown>): Promise<any> {
  try {
    await promise;
    return null;
  } catch (error) {
    return error ?? "undefined was thrown";
  }
}
