import { expect } from "chai";
import { boxSells, variantName } from "../../../../lib/menu/variants";

describe("variants", function () {
  const size = { key: "size", name: "Size", values: [{ value: 20, title: "20 cm" }, { value: 30, title: "30 cm" }] };
  const crust = { key: "crust", name: "Crust", values: [{ value: 0, title: "No crust" }, { value: 1, title: "Cheese" }] };

  describe("the name of a variant", function () {
    it("is the name of the box and the titles of its values, in the order of the attributes", function () {
      expect(variantName("Dish 1", [size, crust], { crust: 1, size: 30 })).to.equal("Dish 1, 30 cm, Cheese");
      expect(variantName("Dish 1", [crust, size], { crust: 1, size: 30 })).to.equal("Dish 1, Cheese, 30 cm");
    });

    it("writes every value, the one that stands for nothing chosen too", function () {
      expect(variantName("Dish 1", [size, crust], { size: 20, crust: 0 })).to.equal("Dish 1, 20 cm, No crust");
    });

    it("shows an attribute with one value", function () {
      const pieces = { key: "pieces", name: "Pieces", values: [{ value: 8, title: "8 pcs" }] };
      expect(variantName("Dish 1", [pieces], { pieces: 8 })).to.equal("Dish 1, 8 pcs");
    });

    it("leaves out an attribute the variant has no value of", function () {
      expect(variantName("Dish 1", [size, crust], { size: 30 })).to.equal("Dish 1, 30 cm");
    });

    it("tells a number from a string of the same digits: a value is matched as it is stored", function () {
      expect(variantName("Dish 1", [size], { size: "30" })).to.equal("Dish 1");
    });
  });

  describe("a box", function () {
    it("sells its variants while it is neither deleted nor switched off", function () {
      expect(boxSells({ enable: true, isDeleted: false })).to.equal(true);
      expect(boxSells({ enable: false, isDeleted: false })).to.equal(false);
      expect(boxSells({ enable: true, isDeleted: true })).to.equal(false);
    });

    it("sells none once it is gone", function () {
      expect(boxSells(undefined)).to.equal(false);
    });
  });
});
