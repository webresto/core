import { expect } from "chai";
import {
  evaluatePlaceAvailability,
  evaluateProductAvailability,
  getMenuPlaceBasedMode,
  getPreparationMinutes,
  isCooked,
  modeRequiresPlace,
  normalizeMenuPlaceBasedMode,
} from "../../lib/product-availability";

describe("product-availability", function () {
  const realSettings = (global as any).Settings;

  afterEach(function () {
    (global as any).Settings = realSettings;
  });

  const dish = { id: "pizza", type: "dish", enable: true };

  describe("menu mode", function () {
    it("falls back to default for anything unknown", function () {
      expect(normalizeMenuPlaceBasedMode(undefined)).to.equal("default");
      expect(normalizeMenuPlaceBasedMode("")).to.equal("default");
      expect(normalizeMenuPlaceBasedMode("nonsense")).to.equal("default");
      expect(normalizeMenuPlaceBasedMode(["single-place"])).to.equal("default");
    });

    it("keeps the three declared modes", function () {
      expect(normalizeMenuPlaceBasedMode("default")).to.equal("default");
      expect(normalizeMenuPlaceBasedMode("single-place")).to.equal("single-place");
      expect(normalizeMenuPlaceBasedMode("multi-place-route")).to.equal("multi-place-route");
    });

    it("requires a point in every mode but the default one", function () {
      expect(modeRequiresPlace("default")).to.equal(false);
      expect(modeRequiresPlace("single-place")).to.equal(true);
      expect(modeRequiresPlace("multi-place-route")).to.equal(true);
    });

    it("reads the setting", async function () {
      (global as any).Settings = { async get() { return "single-place"; } };
      expect(await getMenuPlaceBasedMode()).to.equal("single-place");
    });
  });

  describe("product", function () {
    it("sells an unlimited product", function () {
      const result = evaluateProductAvailability(dish, -1);
      expect(result.available).to.equal(true);
      expect(result.reason).to.equal(null);
      expect(result.productId).to.equal("pizza");
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
    const open = { id: "center", isCookingPoint: true, enable: true };

    it("accepts an enabled kitchen with no schedule", function () {
      const result = evaluatePlaceAvailability(open);
      expect(result.open).to.equal(true);
      expect(result.reason).to.equal(null);
      expect(result.placeId).to.equal("center");
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
      expect(isCooked({ type: undefined })).to.equal(true);
      expect(isCooked({ type: "product" })).to.equal(false);
      expect(isCooked({ type: "service" })).to.equal(false);
    });

    it("is zero for a basket of nothing cooked", function () {
      expect(getPreparationMinutes([])).to.equal(0);
      expect(getPreparationMinutes([
        { id: "water", type: "product", cookingTimeMax: 30 },
        { id: "delivery", type: "service", cookingTimeMax: 50 },
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
