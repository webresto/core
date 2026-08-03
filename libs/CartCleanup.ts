import { ObservablePromise } from "./ObservablePromise";

const DAY_MS = 24 * 60 * 60 * 1000;
const EMPTY_CART_TTL_MS = 3 * DAY_MS;
const CLEANUP_INTERVAL_MS = DAY_MS;
const CLEANUP_BATCH_SIZE = 500;

export type CartCleanupResult = {
  emptyCarts: number;
  abandonedCheckoutCarts: number;
};

function getModels(): { Order: any; OrderDish: any } {
  const globalObject = global as any;
  const sailsObject = globalObject.sails;
  const Order =
    globalObject.Order
    || sailsObject?.models?.Order
    || sailsObject?.models?.order;
  const OrderDish =
    globalObject.OrderDish
    || sailsObject?.models?.OrderDish
    || sailsObject?.models?.orderdish;

  if (!Order || !OrderDish || typeof Order.find !== "function" || typeof OrderDish.destroy !== "function") {
    throw new Error("CartCleanup models are not available");
  }

  return { Order, OrderDish };
}

function twoMonthsBefore(timestamp: number): number {
  const date = new Date(timestamp);
  date.setMonth(date.getMonth() - 2);
  return date.getTime();
}

async function destroyOrdersByCriteria(criteria: object): Promise<number> {
  let deleted = 0;
  const { Order, OrderDish } = getModels();

  while (true) {
    const orders = await Order.find(criteria).limit(CLEANUP_BATCH_SIZE);
    if (orders.length === 0) {
      return deleted;
    }

    const orderIds = orders.map((order: { id: string }) => order.id);
    await OrderDish.destroy({ order: orderIds });
    const destroyed = await Order.destroy({ id: orderIds }).fetch();
    deleted += destroyed.length;

    if (orders.length < CLEANUP_BATCH_SIZE) {
      return deleted;
    }
  }
}

export class CartCleanup {
  private static cleanupPromise: ObservablePromise<CartCleanupResult> | null = null;
  private static cleanupInterval: ReturnType<typeof setInterval> | null = null;

  static start(intervalMs: number = CLEANUP_INTERVAL_MS): void {
    if (process.env.CORE_CART_CLEANUP_DISABLED === "TRUE") {
      return;
    }

    if (CartCleanup.cleanupInterval) {
      clearInterval(CartCleanup.cleanupInterval);
    }

    CartCleanup.cleanup().catch((error) => {
      (global as any).sails?.log?.error("CORE > cart cleanup failed", error);
    });

    CartCleanup.cleanupInterval = setInterval(() => {
      CartCleanup.cleanup().catch((error) => {
        (global as any).sails?.log?.error("CORE > cart cleanup failed", error);
      });
    }, intervalMs);

    CartCleanup.cleanupInterval.unref?.();
  }

  static async cleanup(now: number = Date.now()): Promise<CartCleanupResult> {
    if (CartCleanup.cleanupPromise?.status === "pending") {
      return CartCleanup.cleanupPromise.promise;
    }

    const promise = (async () => {
      const emptyCartCutoff = now - EMPTY_CART_TTL_MS;
      const abandonedCheckoutCutoff = twoMonthsBefore(now);

      const emptyCarts = await destroyOrdersByCriteria({
        state: "CART",
        dishesCount: 0,
        updatedAt: { "<": emptyCartCutoff },
      });

      const abandonedCheckoutCarts = await destroyOrdersByCriteria({
        paid: false,
        orderedAt: null,
        updatedAt: { "<": abandonedCheckoutCutoff },
        or: [
          { state: "CHECKOUT" },
          { state: "PAYMENT" },
        ],
      });

      if (emptyCarts > 0 || abandonedCheckoutCarts > 0) {
        (global as any).sails?.log?.info(
          `CORE > cart cleanup deleted ${emptyCarts} empty carts and ${abandonedCheckoutCarts} abandoned checkout carts`
        );
      }

      return { emptyCarts, abandonedCheckoutCarts };
    })();

    CartCleanup.cleanupPromise = new ObservablePromise(promise);
    return promise;
  }
}
