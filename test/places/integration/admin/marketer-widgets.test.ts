import { expect } from "chai";
import { resetDatabase } from "../../support/reset";
import { add, checkout, newBasket, pickUpAt } from "../../support/storefront";
import PromotionsCountWidget from "../../../../lib/adminpanel/widgets/PromotionsCount";
import PromotionCodesCountWidget from "../../../../lib/adminpanel/widgets/PromotionCodesCount";
import TodayPromotionCodeOrdersWidget from "../../../../lib/adminpanel/widgets/TodayPromotionCodeOrders";
import TodayPromotionOrdersWidget from "../../../../lib/adminpanel/widgets/TodayPromotionOrders";

/**
 * The marketer's dashboard widgets: the promotions and the promo codes switched on, and the orders placed today with
 * a promo code and with a promotion that applied. An entry of the order's `promotionState` that only tells about its
 * code - here, the code gives nothing below its minimum basket - is not a promotion that applied.
 *
 *   Group 1: Dish 1 at 10. Code CODE1 → Promotion 1, 1 off the receipt from a basket of 20.
 */
describe("Marketer widgets", function () {
  let dish1: string;
  let kitchen1: string;

  beforeEach(async function () {
    await resetDatabase();
    const city = (await City.create!({ name: "City 1" }).fetch()).id;
    kitchen1 = (await Place.create!({ title: "Kitchen 1", city, enable: true, isCookingPoint: true, isPickupPoint: true }).fetch()).id;
    const group = await Group.create!({ name: "Group 1", enable: true }).fetch();
    dish1 = (await Dish.create!({ name: "Dish 1", price: 10, enable: true, parentGroup: group.id }).fetch()).id as string;

    await promotion("promotion-1", true);
    await PromotionCode.create!({ id: "code-1", description: "Code 1", code: "CODE1" }).fetch();
    await PromotionCode.addToCollection!("code-1", "promotion", "promotion-1" as any);
  });

  async function promotion(id: string, enable: boolean) {
    await Promotion.createOrUpdate({
      id, name: id, badge: id, description: id, externalId: id,
      isJoint: true, isPublic: false, createdByUser: true, concept: ["origin"],
      configDiscount: { discountType: "flat", discountAmount: 1, dishes: [], groups: [], excludeModifiers: true, minBasketTotal: 20 },
    } as any);
    await Promotion.update!({ id }, { enable, sortOrder: 0 }).fetch();
  }

  const info = (Widget: new () => { getInfo(): Promise<string> }) => new Widget().getInfo();

  /** A basket of Dish 1 with the code, picked up at Kitchen 1 and placed. */
  async function placed(amount: number, code: string | null): Promise<string> {
    const id = await newBasket();
    await add(id, dish1, amount);
    if (code) await Order.applyPromotionCode({ id }, code);
    await pickUpAt(id, kitchen1);
    await checkout(id);
    await Order.order({ id });
    return id;
  }

  it("counts the promotions and the promo codes switched on", async function () {
    await promotion("promotion-2", false);
    await PromotionCode.create!({ id: "code-2", description: "Code 2", code: "CODE2", enable: false }).fetch();

    expect(await info(PromotionsCountWidget)).to.equal("1");
    expect(await info(PromotionCodesCountWidget)).to.equal("1");
  });

  it("counts today's placed orders with a promo code and with a promotion that applied", async function () {
    expect((await Order.findOne!({ id: await placed(3, "CODE1") })).discountTotal).to.equal(1);
    const below = await Order.findOne!({ id: await placed(1, "CODE1") });
    expect(below).to.include({ promotionCode: "code-1", discountTotal: 0 });
    expect(below.promotionState?.map((state) => state.type)).to.deep.equal(["promocode-min-basket-total"]);
    await placed(3, null);
    const basket = await newBasket();
    await add(basket, dish1, 3);
    await Order.applyPromotionCode({ id: basket }, "CODE1");

    expect(await info(TodayPromotionCodeOrdersWidget)).to.equal("2");
    expect(await info(TodayPromotionOrdersWidget)).to.equal("1");
  });
});
