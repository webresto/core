import { expect } from "chai";
import {
  evaluatePlaceAvailability,
  evaluateProductAvailability,
  getPreparationMinutes,
  isCooked,
} from "../../../../lib/menu/product-availability";

describe("product-availability", function () {
  const dish = { id: "dish-1", type: "dish", enable: true };

  describe("product", function () {
    it("sells an unlimited product", function () {
      const result = evaluateProductAvailability(dish, -1);
      expect(result.available).to.equal(true);
      expect(result.reason).to.equal(null);
      expect(result.productId).to.equal("dish-1");
    });

    it("stops a product with a zero balance at the point", function () {
      const result = evaluateProductAvailability(dish, 0);
      expect(result.available).to.equal(false);
      expect(result.reason).to.equal("PRODUCT_STOPPED_AT_PLACE");
    });

    it("refuses more than the point has", function () {
      expect(evaluateProductAvailability(dish, 3, 3).available).to.equal(true);
      expect(evaluateProductAvailability(dish, 3, 4).reason).to.equal("PRODUCT_NOT_ENOUGH_AT_PLACE");
    });

    it("never runs short on unlimited stock", function () {
      expect(evaluateProductAvailability(dish, -1, 9999).available).to.equal(true);
    });

    it("puts a disabled product ahead of stock", function () {
      expect(evaluateProductAvailability({ ...dish, enable: false }, -1).reason).to.equal("PRODUCT_DISABLED");
      // A disabled product is disabled, not "out of stock": the reason is what
      // the operator is shown, and the two call for different fixes.
      expect(evaluateProductAvailability({ ...dish, enable: false }, 0).reason).to.equal("PRODUCT_DISABLED");
    });

    it("does not treat what a catalog row is as unavailability", function () {
      // `notForSale` rides along in the basket at zero and a modifier is not a
      // standalone product; neither may disappear from a menu that shows them.
      expect(evaluateProductAvailability({ ...dish, notForSale: true } as any, -1).available).to.equal(true);
      expect(evaluateProductAvailability({ ...dish, modifier: true } as any, -1).available).to.equal(true);
    });

    it("reports the balance it judged by", function () {
      expect(evaluateProductAvailability(dish, 7).balance).to.equal(7);
    });
  });

  describe("place", function () {
    const open = { id: "kitchen-1", isCookingPoint: true, enable: true };

    it("accepts an enabled kitchen with no schedule", function () {
      const result = evaluatePlaceAvailability(open);
      expect(result.open).to.equal(true);
      expect(result.reason).to.equal(null);
      expect(result.placeId).to.equal("kitchen-1");
    });

    it("separates no point at all from a disabled one", function () {
      expect(evaluatePlaceAvailability(null).reason).to.equal("PLACE_NOT_SELECTED");
      expect(evaluatePlaceAvailability({ ...open, enable: false }).reason).to.equal("PLACE_DISABLED");
      expect(evaluatePlaceAvailability({ ...open, isCookingPoint: false }).reason).to.equal("PLACE_DISABLED");
    });

    it("calls a kitchen closed outside its schedule", function () {
      const monday = { ...open, worktime: [{ dayOfWeek: ["monday"], start: "10:00", stop: "20:00" }] };
      // 2026-08-24 is a Monday.
      expect(evaluatePlaceAvailability(monday, new Date("2026-08-24T12:00:00")).open).to.equal(true);
      expect(evaluatePlaceAvailability(monday, new Date("2026-08-24T23:00:00")).reason).to.equal("PLACE_CLOSED");
      // Sunday: the schedule says nothing about today, which is closed and not broken.
      expect(evaluatePlaceAvailability(monday, new Date("2026-08-23T12:00:00")).reason).to.equal("PLACE_CLOSED");
    });
  });

  describe("preparation time", function () {
    it("counts only cooked products", function () {
      expect(isCooked({ type: "dish" })).to.equal(true);
      // The model defaults an omitted type to `dish`, so nothing reaches here
      // without one.
      expect(isCooked({ type: "product" })).to.equal(false);
      expect(isCooked({ type: "service" })).to.equal(false);
    });

    it("is zero for a basket of nothing cooked", function () {
      expect(getPreparationMinutes([])).to.equal(0);
      expect(getPreparationMinutes([
        { id: "product-1", type: "product", cookingTimeMax: 30 },
        { id: "service-1", type: "service", cookingTimeMax: 50 },
      ])).to.equal(0);
    });

    it("takes the slowest line, not the sum", function () {
      expect(getPreparationMinutes([
        { id: "a", type: "dish", cookingTimeMax: 15 },
        { id: "b", type: "dish", cookingTimeMax: 30 },
      ])).to.equal(30);
    });

    it("adds nothing for a cooked product with no time configured", function () {
      expect(getPreparationMinutes([
        { id: "a", type: "dish" },
        { id: "b", type: "dish", cookingTimeMax: 20 },
      ])).to.equal(20);
    });

    it("ignores nonsense values instead of trusting them", function () {
      expect(getPreparationMinutes([
        { id: "a", type: "dish", cookingTimeMax: 0 },
        { id: "b", type: "dish", cookingTimeMax: NaN },
        { id: "c", type: "dish", cookingTimeMax: 12 },
      ])).to.equal(12);
    });
  });
});
