import { expect } from "chai";
import { CartCleanup } from "../../libs/CartCleanup";

describe("CartCleanup", function () {
  const realOrder = (global as any).Order;
  const realOrderDish = (global as any).OrderDish;

  afterEach(function () {
    (global as any).Order = realOrder;
    (global as any).OrderDish = realOrderDish;
  });

  it("deletes empty CART records older than three days", async function () {
    const now = Date.UTC(2026, 5, 8);
    const orders: Array<Record<string, any>> = [
      { id: "old-empty", state: "CART", dishesCount: 0, updatedAt: now - 4 * 24 * 60 * 60 * 1000, paid: false, orderedAt: null },
      { id: "fresh-empty", state: "CART", dishesCount: 0, updatedAt: now - 1 * 24 * 60 * 60 * 1000, paid: false, orderedAt: null },
      { id: "old-filled", state: "CART", dishesCount: 1, updatedAt: now - 4 * 24 * 60 * 60 * 1000, paid: false, orderedAt: null },
    ];
    const destroyedDishes: string[] = [];

    bindFakeModels(orders, destroyedDishes);

    const result = await CartCleanup.cleanup(now);

    expect(result.emptyCarts).to.equal(1);
    expect(result.abandonedCheckoutCarts).to.equal(0);
    expect(orders.map((order) => order.id)).to.deep.equal(["fresh-empty", "old-filled"]);
    expect(destroyedDishes).to.deep.equal(["old-empty"]);
  });

  it("deletes unpaid CHECKOUT and PAYMENT records older than two months", async function () {
    const now = Date.UTC(2026, 5, 8);
    const orders = [
      { id: "old-checkout", state: "CHECKOUT", dishesCount: 2, updatedAt: Date.UTC(2026, 2, 30), paid: false, orderedAt: null },
      { id: "old-payment", state: "PAYMENT", dishesCount: 2, updatedAt: Date.UTC(2026, 2, 30), paid: false, orderedAt: null },
      { id: "paid-payment", state: "PAYMENT", dishesCount: 2, updatedAt: Date.UTC(2026, 2, 30), paid: true, orderedAt: null },
      { id: "fresh-checkout", state: "CHECKOUT", dishesCount: 2, updatedAt: Date.UTC(2026, 4, 30), paid: false, orderedAt: null },
      { id: "ordered", state: "CHECKOUT", dishesCount: 2, updatedAt: Date.UTC(2026, 2, 30), paid: false, orderedAt: 1770000000 },
    ];
    const destroyedDishes: string[] = [];

    bindFakeModels(orders, destroyedDishes);

    const result = await CartCleanup.cleanup(now);

    expect(result.emptyCarts).to.equal(0);
    expect(result.abandonedCheckoutCarts).to.equal(2);
    expect(orders.map((order) => order.id)).to.deep.equal(["paid-payment", "fresh-checkout", "ordered"]);
    expect(destroyedDishes).to.deep.equal(["old-checkout", "old-payment"]);
  });
});

function bindFakeModels(orders: any[], destroyedDishes: string[]) {
  (global as any).Order = {
    find(criteria: any) {
      return {
        limit(size: number) {
          return Promise.resolve(orders.filter((order) => matchesCriteria(order, criteria)).slice(0, size));
        },
      };
    },
    destroy(criteria: any) {
      return {
        fetch() {
          const ids = Array.isArray(criteria.id) ? criteria.id : [criteria.id];
          const destroyed = orders.filter((order) => ids.includes(order.id));
          for (const order of destroyed) {
            orders.splice(orders.indexOf(order), 1);
          }
          return Promise.resolve(destroyed);
        },
      };
    },
  };

  (global as any).OrderDish = {
    destroy(criteria: any) {
      const ids = Array.isArray(criteria.order) ? criteria.order : [criteria.order];
      destroyedDishes.push(...ids);
      return Promise.resolve();
    },
  };
}

function matchesCriteria(order: any, criteria: any): boolean {
  for (const [key, value] of Object.entries(criteria)) {
    if (key === "or") {
      if (!(value as any[]).some((part) => matchesCriteria(order, part))) {
        return false;
      }
      continue;
    }

    if (typeof value === "object" && value !== null && "<" in value) {
      if (!(order[key] < (value as any)["<"])) {
        return false;
      }
      continue;
    }

    if (order[key] !== value) {
      return false;
    }
  }
  return true;
}
