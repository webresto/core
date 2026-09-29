import { expect } from "chai";
import { CartCleanup } from "../../../../lib/order/CartCleanup";
import { resetDatabase } from "../../support/reset";

/**
 * The daily sweep of abandoned baskets: an empty basket untouched for three
 * days goes, and so does an unpaid one left at checkout or payment for two
 * months; a paid or placed one never does. Its lines go with it.
 */
describe("Cart cleanup", function () {
  const DAY = 24 * 60 * 60 * 1000;
  const NOW = Date.UTC(2026, 5, 8);

  beforeEach(async function () {
    await resetDatabase();
  });

  /** A basket as it was left: its state and totals written as they are, dated `updatedAt`. */
  async function left(name: string, values: Record<string, unknown>, updatedAt: number): Promise<string> {
    const order = await Order.create({ comment: name }).fetch();
    await (Order.update({ id: order.id }, { ...values, updatedAt }) as any).meta({ skipAllLifecycleCallbacks: true }).fetch();
    return order.id;
  }

  const remaining = async () => (await Order.find({})).map((order: any) => order.comment).sort();

  it("removes an empty basket untouched for more than three days", async function () {
    await left("Order 1", { state: "CART", dishesCount: 0 }, NOW - 4 * DAY);
    await left("Order 2", { state: "CART", dishesCount: 0 }, NOW - 1 * DAY);
    await left("Order 3", { state: "CART", dishesCount: 1 }, NOW - 4 * DAY);

    const result = await CartCleanup.cleanup(NOW);

    expect(result).to.deep.equal({ emptyCarts: 1, abandonedCheckoutCarts: 0 });
    expect(await remaining()).to.deep.equal(["Order 2", "Order 3"]);
  });

  it("removes an unpaid basket left at checkout or payment for more than two months, and its lines", async function () {
    const old = Date.UTC(2026, 2, 30);
    const checkout = await left("Order 1", { state: "CHECKOUT", dishesCount: 2, paid: false }, old);
    await left("Order 2", { state: "PAYMENT", dishesCount: 2, paid: false }, old);
    await left("Order 3", { state: "PAYMENT", dishesCount: 2, paid: true }, old);
    await left("Order 4", { state: "CHECKOUT", dishesCount: 2, paid: false }, Date.UTC(2026, 4, 30));
    await left("Order 5", { state: "CHECKOUT", dishesCount: 2, paid: false, orderedAt: 1770000000 }, old);
    await OrderDish.create({ order: checkout, amount: 2 }).fetch();

    const result = await CartCleanup.cleanup(NOW);

    expect(result).to.deep.equal({ emptyCarts: 0, abandonedCheckoutCarts: 2 });
    expect(await remaining()).to.deep.equal(["Order 3", "Order 4", "Order 5"]);
    expect(await OrderDish.count({ order: checkout })).to.equal(0);
  });
});
