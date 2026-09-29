import { expect } from "chai";
import { resetDatabase } from "../../support/reset";
import { add, CUSTOMER, newBasket, pickUpAt, thrown } from "../../support/storefront";

/**
 * Promotion codes: a code the customer types switches on the promotions it is
 * linked to, for this basket. A promotion that chooses no products and no groups
 * applies to nothing by itself and to the whole receipt through its code. The
 * code is read case-insensitively and rechecked at every recount, so a code the
 * operator switches off leaves baskets that already had it. Applying or removing
 * a code sends the basket back to CART.
 *
 *   Group 1: Dish 1 at 10.1, Dish 2 at 15.2. The basket: five and four — 111.3.
 *   Code CODE1 → Promotion 1, 1.45 off the receipt.
 */
describe("Promotion codes", function () {
  let dish1: string;
  let dish2: string;
  let kitchen1: string;

  beforeEach(async function () {
    await resetDatabase();
    const city = (await City.create({ name: "City 1" }).fetch()).id;
    kitchen1 = (await Place.create({ title: "Kitchen 1", city, enable: true, isCookingPoint: true, isPickupPoint: true }).fetch()).id;
    const group = await Group.create({ name: "Group 1", enable: true }).fetch();
    dish1 = (await Dish.create({ name: "Dish 1", price: 10.1, enable: true, parentGroup: group.id }).fetch()).id;
    dish2 = (await Dish.create({ name: "Dish 2", price: 15.2, enable: true, parentGroup: group.id }).fetch()).id;

    await promotion({ discountType: "flat", discountAmount: 1.45 });
    await PromotionCode.create({ id: "code-1", description: "Code 1", code: "CODE1" }).fetch();
    await PromotionCode.addToCollection("code-1", "promotion", "promotion-1");
  });

  async function promotion(discount: Record<string, unknown>) {
    await Promotion.createOrUpdate({
      id: "promotion-1", name: "Promotion 1", badge: "badge-1", description: "Description 1", externalId: "promotion-1",
      isJoint: true, isPublic: false, createdByUser: true, concept: ["origin"],
      configDiscount: { dishes: [], groups: [], excludeModifiers: true, ...discount },
    } as any);
    await Promotion.update({ id: "promotion-1" }, { enable: true, sortOrder: 0 }).fetch();
  }

  async function basket(): Promise<string> {
    const id = await newBasket();
    await add(id, dish1, 5);
    await add(id, dish2, 4);
    return id;
  }
  const apply = (id: string, code: string | null) => Order.applyPromotionCode({ id }, code);

  it("without its code, the promotion discounts nothing", async function () {
    expect((await Order.findOne({ id: await basket() })).discountTotal).to.equal(0);
  });

  it("typed in any case, the code takes its promotion off the receipt", async function () {
    const id = await basket();
    const order = await apply(id, "code1");

    expect(order).to.include({ promotionCodeString: "CODE1", promotionCode: "code-1", discountTotal: 1.45, basketTotal: 111.3, total: 109.85 });
  });

  it("removed, it takes the discount with it", async function () {
    const id = await basket();
    await apply(id, "CODE1");

    const order = await apply(id, null);
    expect(order).to.include({ promotionCodeString: null, promotionCode: null, discountTotal: 0 });
  });

  it("a code nobody has is kept as typed, with no discount and a reason", async function () {
    const id = await basket();
    const order = await apply(id, "CODE9");

    expect(order).to.include({ promotionCodeString: "CODE9", promotionCode: null, promotionCodeCheckValidTill: null, discountTotal: 0 });
    expect(order.promotionCodeDescription).to.equal("Promocode expired or not valid");
  });

  it("applied at checkout, sends the basket back to CART", async function () {
    const id = await basket();
    await pickUpAt(id, kitchen1);
    await Order.check({ id }, CUSTOMER, "pickup");
    expect((await Order.findOne({ id })).state).to.equal("CHECKOUT");

    await apply(id, "CODE1");
    expect((await Order.findOne({ id })).state).to.equal("CART");
  });

  it("switched off by the operator, leaves the baskets that had it and cannot be applied", async function () {
    const id = await basket();
    await apply(id, "CODE1");
    await PromotionCode.updateOne({ id: "code-1" }).set({ enable: false });

    let order = await Order.countCart({ id });
    expect(order).to.include({ promotionCode: null, discountTotal: 0 });

    order = await apply(id, "CODE1");
    expect(order).to.include({ promotionCode: null, discountTotal: 0 });
  });

  it("takes a changed promotion at once: a percentage off the receipt", async function () {
    await Promotion.update({ id: "promotion-1" }, { configDiscount: { discountType: "percentage", discountAmount: 10, dishes: [], groups: [], excludeModifiers: true } }).fetch();
    const id = await basket();

    expect((await apply(id, "CODE1")).discountTotal).to.equal(11.13);
  });

  it("honours the promotion's minimum basket total", async function () {
    await Promotion.update({ id: "promotion-1" }, { configDiscount: { discountType: "flat", discountAmount: 1.45, dishes: [], groups: [], excludeModifiers: true, minBasketTotal: 200 } }).fetch();
    const id = await basket();

    expect((await apply(id, "CODE1")).discountTotal).to.equal(0);
    await add(id, dish2, 6);
    expect((await Order.findOne({ id })).discountTotal).to.equal(1.45);
  });

  it("is saved upper-cased, code and prefix", async function () {
    const code = await PromotionCode.create({ description: "Code 2", code: "code2", prefix: "prefix" }).fetch();
    expect(code).to.include({ code: "CODE2", prefix: "PREFIX" });
  });

  it("cannot be applied to an order already placed", async function () {
    const id = await basket();
    await pickUpAt(id, kitchen1);
    await Order.check({ id }, CUSTOMER, "pickup");
    await Order.order({ id });

    expect(String(await thrown(apply(id, "CODE1")))).to.contain("apply promocode on current state");
  });
});
