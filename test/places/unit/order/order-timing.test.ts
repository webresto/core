import { expect } from "chai";
import { fitsMaxWait, productFitsMaxWait, resolveOrderTiming } from "../../../../lib/order/order-timing";

/**
 * The two ways a customer can time an order — "as soon as possible", with an
 * optional ceiling on the wait, or "at a date" — and the ceiling itself. How
 * long the delivery will take is in `integration/order/delivery-estimate`: it
 * reads the installation's settings.
 */
describe("Order timing", function () {
  describe("timing modes", function () {
    it("defaults to as soon as possible with no ceiling", function () {
      expect(resolveOrderTiming({}).mode).to.equal("asap");
      expect(resolveOrderTiming({}).code).to.equal(undefined);
    });

    it("tells the two modes apart", function () {
      expect(resolveOrderTiming({ date: "2026-09-01 12:00:00" }).mode).to.equal("scheduled");
      expect(resolveOrderTiming({ maxWaitMinutes: 60 }).mode).to.equal("asap");
      expect(resolveOrderTiming({ date: "   " }).mode).to.equal("asap");
    });

    it("refuses an order that is in both modes", function () {
      expect(resolveOrderTiming({ date: "2026-09-01 12:00:00", maxWaitMinutes: 60 }).code).to.equal("ORDER_TIMING_AMBIGUOUS");
    });

    it("refuses a wait that is not a positive number of minutes, and reads garbage as no ceiling", function () {
      expect(resolveOrderTiming({ maxWaitMinutes: 0 }).code).to.equal("ORDER_WAIT_TOO_SHORT");
      expect(resolveOrderTiming({ maxWaitMinutes: -5 }).code).to.equal("ORDER_WAIT_TOO_SHORT");
      expect(resolveOrderTiming({ maxWaitMinutes: NaN }).code).to.equal(undefined);
    });
  });

  describe("maximum wait", function () {
    it("compares the promise against the stated ceiling", function () {
      expect(fitsMaxWait({ totalMinutes: 60 }, 60)).to.equal(true);
      expect(fitsMaxWait({ totalMinutes: 61 }, 60)).to.equal(false);
      expect(fitsMaxWait({ totalMinutes: 999 }, null)).to.equal(true);
    });

    it("judges one product by its own cooking time", function () {
      expect(productFitsMaxWait({ type: "dish", cookingTimeMax: 45 }, 30)).to.equal(false);
      expect(productFitsMaxWait({ type: "dish", cookingTimeMax: 30 }, 30)).to.equal(true);
      // No number, no promise; and a product that is not cooked has no time at all.
      expect(productFitsMaxWait({ type: "dish", cookingTimeMax: null }, 30)).to.equal(true);
      expect(productFitsMaxWait({ type: "product", cookingTimeMax: 45 }, 30)).to.equal(true);
      expect(productFitsMaxWait({ type: "dish", cookingTimeMax: 45 }, null)).to.equal(true);
    });
  });
});
