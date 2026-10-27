import { expect } from "chai";
import { mapPromotionFull } from "../../../../lib/adminpanel/src/controller/get-marketing-promotions";
import { discountSummary } from "../../../../lib/adminpanel/src/controller/marketing-helpers";

/** What the admin's promotion form reads of a saved promotion: the ways of receiving an order it is for. */
describe("Promotion form", function () {
  const configDiscount = { discountType: "flat", discountAmount: 1, dishes: [], groups: [], serviceType: ["pickup"] } as any;

  it("reads the ways of receiving an order back, so saving the form keeps them", function () {
    expect(mapPromotionFull({ id: "promotion-1", configDiscount }).configDiscount.serviceType).to.deep.equal(["pickup"]);
    expect(mapPromotionFull({ id: "promotion-1", configDiscount: { ...configDiscount, serviceType: undefined } }).configDiscount.serviceType).to.deep.equal([]);
  });

  it("names them in the summary of the list", function () {
    expect(discountSummary(configDiscount).serviceType).to.deep.equal(["pickup"]);
  });
});
