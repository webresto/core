import { expect } from "chai";
import { resetDatabase } from "../../support/reset";
import { add, newBasket } from "../../support/storefront";

/**
 * Promotions an operator configures (`Promotion` rows): a flat amount off each
 * unit or a percentage, on chosen products and groups. (The whole receipt is a
 * promotion code's: see `promotion-code`.) Joint promotions add up; a promotion that is not joint takes the
 * basket alone, and of several such the one with the lowest `sortOrder` wins.
 * Switching one off takes its discount off at the next recount.
 *
 * A line is discounted when both its product and its group are chosen; `*`
 * chooses all of either.
 *
 *   Group 1: Dish 1 at 10.1, Dish 2 at 15.2. Group 2: Dish 3 at 10.
 *   The basket: five Dish 1 and four Dish 2 — 111.3.
 */
describe("Promotions", function () {
  const d: Record<string, any> = {};
  const g: Record<string, any> = {};

  beforeEach(async function () {
    await resetDatabase();
    g.group1 = await Group.create({ name: "Group 1", enable: true }).fetch();
    g.group2 = await Group.create({ name: "Group 2", enable: true }).fetch();
    d.dish1 = await Dish.create({ name: "Dish 1", price: 10.1, enable: true, parentGroup: g.group1.id }).fetch();
    d.dish2 = await Dish.create({ name: "Dish 2", price: 15.2, enable: true, parentGroup: g.group1.id }).fetch();
    d.dish3 = await Dish.create({ name: "Dish 3", price: 10, enable: true, parentGroup: g.group2.id }).fetch();
  });

  /** A promotion as the admin saves it, switched on. */
  async function promotion(id: string, discount: Record<string, unknown>, values: Record<string, unknown> = {}) {
    await Promotion.createOrUpdate({
      id, name: id, badge: "badge-1", description: "Description 1", externalId: id,
      isJoint: true, isPublic: true, createdByUser: true, concept: ["origin"],
      configDiscount: { dishes: [], groups: [], excludeModifiers: true, ...discount },
      ...values,
    } as any);
    await Promotion.update({ id }, { enable: true, sortOrder: (values.sortOrder as number) ?? 0 }).fetch();
  }

  async function basket(): Promise<string> {
    const id = await newBasket();
    await add(id, d.dish1.id, 5);
    await add(id, d.dish2.id, 4);
    return id;
  }
  const discountOf = async (id: string) => (await Order.findOne({ id })).discountTotal;

  it("a flat amount off each unit of the chosen products, line by line", async function () {
    await promotion("promotion-1", { discountType: "flat", discountAmount: 1.33, dishes: [d.dish1.id, d.dish2.id], groups: ["*"] });
    const id = await basket();

    const order = await Order.findOne({ id });
    expect(order.discountTotal).to.equal(11.97);
    expect(order.total).to.equal(111.3 - 11.97);
    expect((await OrderDish.findOne({ order: id, dish: d.dish1.id })).discountTotal).to.equal(6.65);
  });

  it("a percentage off every product of the chosen group", async function () {
    await promotion("promotion-1", { discountType: "percentage", discountAmount: 10, dishes: ["*"], groups: [g.group1.id] });
    expect(await discountOf(await basket())).to.equal(11.13);
  });

  it("does nothing for a basket without the chosen products", async function () {
    await promotion("promotion-1", { discountType: "flat", discountAmount: 1, dishes: [d.dish3.id], groups: ["*"] });
    expect(await discountOf(await basket())).to.equal(0);
  });

  it("joint promotions on different products add up", async function () {
    await promotion("promotion-1", { discountType: "percentage", discountAmount: 10, dishes: [d.dish1.id], groups: ["*"] });
    await promotion("promotion-2", { discountType: "flat", discountAmount: 1.33, dishes: [d.dish2.id], groups: ["*"] });
    // 10% of 50.5, and 1.33 on four.
    expect(await discountOf(await basket())).to.equal(10.37);
  });

  it("a promotion that is not joint takes the basket alone", async function () {
    await promotion("promotion-1", { discountType: "percentage", discountAmount: 10, dishes: ["*"], groups: [g.group1.id] }, { isJoint: false });
    await promotion("promotion-2", { discountType: "flat", discountAmount: 1, dishes: ["*"], groups: [g.group1.id] });
    expect(await discountOf(await basket())).to.equal(11.13);
  });

  it("of two that are not joint, the lower sortOrder wins", async function () {
    await promotion("promotion-1", { discountType: "percentage", discountAmount: 10, dishes: ["*"], groups: [g.group1.id] }, { isJoint: false, sortOrder: 5 });
    await promotion("promotion-2", { discountType: "flat", discountAmount: 1, dishes: [d.dish1.id], groups: ["*"] }, { isJoint: false, sortOrder: -1 });
    expect(await discountOf(await basket())).to.equal(5);
  });

  it("switched off, it leaves the basket at the next recount", async function () {
    await promotion("promotion-1", { discountType: "flat", discountAmount: 1.33, dishes: [d.dish1.id], groups: ["*"] });
    const id = await basket();
    expect(await discountOf(id)).to.equal(6.65);

    await Promotion.update({ id: "promotion-1" }, { enable: false }).fetch();
    await Order.countCart({ id });
    expect(await discountOf(id)).to.equal(0);
    expect((await OrderDish.findOne({ order: id, dish: d.dish1.id })).discountTotal).to.equal(0);
  });
});
