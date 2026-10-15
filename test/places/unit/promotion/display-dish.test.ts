import { expect } from "chai";
import ConfiguredPromotion from "../../../../adapters/promotion/default/configuredPromotion";

/**
 * What a promotion shows on a dish it discounts: the price of one after the
 * discount, with the amount and the type as configured. The same arithmetic the
 * basket does to a line of the dish alone, so what is shown is what is charged.
 * Which dishes a promotion discounts is not asked here — see `promotion`.
 */
describe("Promotion price shown on a dish", function () {
  const promotion = (configDiscount: Record<string, unknown>, values: Record<string, unknown> = {}) => {
    const definition = {
      id: "promotion-1", name: "Promotion 1", isJoint: true, isPublic: true, description: "", concept: [] as string[],
      externalId: "promotion-1", configDiscount: { dishes: ["*"], groups: [], ...configDiscount }, ...values,
    } as any;
    return new ConfiguredPromotion(definition, definition.configDiscount);
  };
  const shown = (handler: ConfiguredPromotion, price: number) => {
    const { salePrice, discountAmount, discountType } = handler.displayDish({ id: "dish-1", price } as any);
    return { salePrice, discountAmount, discountType };
  };

  it("a percentage: the price after it, not the discount itself", function () {
    expect(shown(promotion({ discountType: "percentage", discountAmount: 10 }), 15.2))
      .to.deep.equal({ salePrice: 13.68, discountAmount: 10, discountType: "percentage" });
    expect(shown(promotion({ discountType: "percentage", discountAmount: 5 }), 449).salePrice).to.equal(426.55);
  });

  it("a flat amount: off the price of one, never below zero", function () {
    expect(shown(promotion({ discountType: "flat", discountAmount: 1.33 }), 10.1))
      .to.deep.equal({ salePrice: 8.77, discountAmount: 1.33, discountType: "flat" });
    expect(shown(promotion({ discountType: "flat", discountAmount: 20 }), 10.1).salePrice).to.equal(0);
  });

  it("joint or not, a public promotion shows its price", function () {
    expect(shown(promotion({ discountType: "flat", discountAmount: 1 }, { isJoint: false }), 10).salePrice).to.equal(9);
  });

  it("shows nothing for a promotion the customer is not told about, one with no discount, and a free product", function () {
    const nothing = { salePrice: undefined, discountAmount: undefined, discountType: undefined };
    expect(shown(promotion({ discountType: "percentage", discountAmount: 10 }, { isPublic: false }), 10)).to.deep.equal(nothing);
    expect(shown(promotion({ gift: { minBasketTotal: 0, dishes: [{ dishId: "dish-2", amount: 1 }] } }), 10)).to.deep.equal(nothing);
    expect(shown(promotion({ discountType: "percentage", discountAmount: 0 }), 10)).to.deep.equal(nothing);
    expect(shown(promotion({ discountType: "percentage", discountAmount: 10 }), 0)).to.deep.equal(nothing);
  });
});
