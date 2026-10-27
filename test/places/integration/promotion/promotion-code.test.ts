import { expect } from "chai";
import { resetDatabase } from "../../support/reset";
import { takeOffStoppedPromotionCodes } from "../../../../lib/order/stopped-promotion-codes";
import { add, CUSTOMER, newBasket, pickUpAt, thrown, updateOrder } from "../../support/storefront";

/**
 * Promotion codes: a code the customer types switches on the promotions it is
 * linked to, for this basket. A promotion that chooses no products and no groups
 * applies to nothing by itself and to the whole receipt through its code. The
 * code is read case-insensitively and rechecked at every recount, so a code the
 * operator switches off leaves baskets that already had it. Applying or removing
 * a code sends the basket back to CART. A code's promotions go first, and apply
 * whether they are switched on or off.
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
  const state = async (id: string) => (await Order.findOne({ id })).state;
  const discount = async (id: string) => (await Order.findOne({ id })).discountTotal;
  const line = (id: string, dish: string) => OrderDish.findOne({ order: id, dish });
  /** changes Promotion 1, the code's */
  const change = (values: Record<string, unknown>) => Promotion.update({ id: "promotion-1" }, values).fetch();
  /** the entry of the order's `promotionState` of a type */
  const entry = (order: any, type: string) => order.promotionState.find((item: any) => item.type === type);

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

  it("switched off by the operator, leaves the baskets that had it, code and text, and cannot be applied", async function () {
    const id = await basket();
    await apply(id, "CODE1");
    await PromotionCode.updateOne({ id: "code-1" }).set({ enable: false });

    let order = await Order.countCart({ id });
    expect(order).to.include({ promotionCode: null, promotionCodeString: null, promotionCodeDescription: null, discountTotal: 0 });
    // kept so: the next change of the basket reads it from the database
    expect(await updateOrder(id, { comment: "Comment 1" })).to.include({ promotionCodeString: null, promotionCodeDescription: null });

    order = await apply(id, "CODE1");
    expect(order).to.include({ promotionCode: null, discountTotal: 0 });
  });

  it("stopped while in carts, leaves them at the sweep without a change of theirs; a checked one goes back to CART", async function () {
    const cart = await basket();
    await apply(cart, "CODE1");
    const checked = await basket();
    await apply(checked, "CODE1");
    await pickUpAt(checked, kitchen1);
    await Order.check({ id: checked }, CUSTOMER, "pickup");

    expect(await takeOffStoppedPromotionCodes()).to.equal(0);
    expect(await state(checked)).to.equal("CHECKOUT");

    await PromotionCode.updateOne({ id: "code-1" }).set({ enable: false });
    expect(await takeOffStoppedPromotionCodes()).to.equal(2);
    expect(await updateOrder(cart, { comment: "Comment 1" })).to.include({ promotionCode: null, promotionCodeString: null, discountTotal: 0 });
    expect(await state(checked)).to.equal("CART");
    expect(await takeOffStoppedPromotionCodes()).to.equal(0);
  });

  it("takes a changed promotion at once: a percentage off the receipt", async function () {
    await Promotion.update({ id: "promotion-1" }, { configDiscount: { discountType: "percentage", discountAmount: 10, dishes: [], groups: [], excludeModifiers: true } }).fetch();
    const id = await basket();

    expect((await apply(id, "CODE1")).discountTotal).to.equal(11.13);
  });

  it("honours the promotion's minimum basket total; below it, the order says from which sum", async function () {
    await Promotion.update({ id: "promotion-1" }, { configDiscount: { discountType: "flat", discountAmount: 1.45, dishes: [], groups: [], excludeModifiers: true, minBasketTotal: 200 } }).fetch();
    const id = await basket();

    const below = await apply(id, "CODE1");
    expect(below).to.include({ promotionCode: "code-1", discountTotal: 0 });
    expect(below.promotionState).to.deep.include({
      type: "promocode-min-basket-total",
      message: "The promo code works from a basket total of 200",
      state: { promotionId: "promotion-1", minBasketTotal: 200, basketTotal: 111.3 },
      byCode: true,
    });
    await add(id, dish2, 6);
    expect(await Order.findOne({ id }))
      .to.include({ discountTotal: 1.45 })
      .and.to.have.property("promotionState").that.satisfies((states: unknown) => !JSON.stringify(states).includes("promocode-min-basket-total"));
  });

  describe("its dates and hours", function () {
    const day = (offset: number) => {
      const date = new Date();
      date.setDate(date.getDate() + offset);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    };
    const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const terms = (values: Record<string, unknown>) => PromotionCode.updateOne({ id: "code-1" }).set(values);

    it("works from its start day to its stop day, both in", async function () {
      await terms({ startDate: day(0), stopDate: day(0) });
      expect((await apply(await basket(), "CODE1")).discountTotal).to.equal(1.45);
    });

    it("before its start day, or after its stop day, cannot be applied", async function () {
      await terms({ startDate: day(1) });
      expect(await apply(await basket(), "CODE1")).to.include({ promotionCode: null, discountTotal: 0 });

      await terms({ startDate: "", stopDate: day(-1) });
      expect(await apply(await basket(), "CODE1")).to.include({ promotionCode: null, discountTotal: 0 });
    });

    it("out of its hours, cannot be applied; within them, it can", async function () {
      const today = DAYS[new Date().getDay()];
      await terms({ workTime: { dayOfWeek: DAYS.filter((name) => name !== today), start: "00:00", stop: "23:59" } });
      expect(await apply(await basket(), "CODE1")).to.include({ promotionCode: null, discountTotal: 0 });

      await terms({ workTime: { dayOfWeek: [today], start: "00:00", stop: "23:59" } });
      expect((await apply(await basket(), "CODE1")).discountTotal).to.equal(1.45);
    });

    it("ended after it was applied, leaves the basket at the next recount", async function () {
      const id = await basket();
      await apply(id, "CODE1");
      await terms({ stopDate: day(-1) });

      expect(await Order.countCart({ id })).to.include({ promotionCode: null, promotionCodeString: null, discountTotal: 0 });
    });

    it("out of its promotion's hours, gives nothing and says so", async function () {
      const today = DAYS[new Date().getDay()];
      await change({ worktime: [{ dayOfWeek: DAYS.filter((name) => name !== today), start: "00:00", stop: "23:59" }] });
      const order = await apply(await basket(), "CODE1");

      expect(order).to.include({ promotionCode: "code-1", discountTotal: 0 });
      expect(entry(order, "promocode-promotion-hours")).to.deep.include({ state: { promotionId: "promotion-1" }, byCode: true });
    });
  });

  it("works for the ways of receiving an order its promotion is for, and says so otherwise", async function () {
    await change({ configDiscount: { discountType: "flat", discountAmount: 1.45, dishes: [], groups: [], excludeModifiers: true, serviceType: ["pickup"] } });
    const id = await basket();
    const order = await apply(id, "CODE1");
    expect(order.discountTotal).to.equal(0);
    expect(entry(order, "promocode-service-type")).to.deep.include({ state: { promotionId: "promotion-1", serviceTypes: ["pickup"] }, byCode: true });

    await pickUpAt(id, kitchen1);
    expect(await discount(id)).to.equal(1.45);
  });

  /**
   * With the promotions that apply by themselves: the code's go first. Dish 1 is five, Dish 2 four;
   * Promotion 2 takes 1 off each Dish 1 and is exclusive, Promotion 3 takes 1 off each Dish 2 and is joint.
   */
  describe("with the automatic promotions", function () {
    async function automatic(id: string, dish: string, isJoint: boolean) {
      await Promotion.createOrUpdate({
        id, name: id, badge: "badge-1", description: id, externalId: id,
        isJoint, isPublic: false, createdByUser: true, concept: ["origin"],
        configDiscount: { discountType: "flat", discountAmount: 1, dishes: [dish], groups: ["*"], excludeModifiers: true },
      } as any);
      await Promotion.update({ id }, { enable: true, sortOrder: 0 }).fetch();
    }

    beforeEach(async function () {
      await automatic("promotion-2", dish1, false);
      await automatic("promotion-3", dish2, true);
    });

    it("a joint code puts an exclusive automatic promotion aside and goes with the joint ones", async function () {
      const id = await basket();
      expect(await discount(id)).to.equal(5);

      // 1.45 off the receipt and 1 off each Dish 2
      const order = await apply(id, "CODE1");
      expect(order.discountTotal).to.equal(5.45);
      expect((await line(id, dish1)).discountId).to.equal(null);
      expect((await line(id, dish2)).discountId).to.equal("promotion-3");
      // the entries of the code's promotion and of the one it puts aside say they are the code's
      expect(order.promotionState?.map((item) => [item.message, item.byCode])).to.deep.equal([
        ["Description 1", true],
        ["promotion-3", undefined],
        ["The promo code does not stack with: promotion-2", true],
      ]);
      expect(entry(order, "promocode-sets-aside").state).to.deep.equal({ promotions: [{ id: "promotion-2", name: "promotion-2", description: "promotion-2" }] });
    });

    it("an exclusive code takes the basket alone, and says what it puts aside", async function () {
      await change({ isJoint: false });
      const order = await apply(await basket(), "CODE1");
      expect(order.discountTotal).to.equal(1.45);
      // Promotion 3 would not apply without the code either: Promotion 2 took the basket
      expect(entry(order, "promocode-sets-aside").state.promotions.map((item: any) => item.id)).to.deep.equal(["promotion-2"]);
    });

    it("below its minimum basket total, puts nothing aside", async function () {
      await change({ configDiscount: { discountType: "flat", discountAmount: 1.45, dishes: [], groups: [], excludeModifiers: true, minBasketTotal: 200 } });
      const order = await apply(await basket(), "CODE1");
      expect(order.discountTotal).to.equal(5);
      expect(JSON.stringify(order.promotionState)).to.contain("promocode-min-basket-total");
      expect(entry(order, "promocode-sets-aside")).to.equal(undefined);
    });

    it("takes the lines first", async function () {
      // Promotion 2 joint now, and the code's 10% off each Dish 1 - switched off, so only through the code
      await automatic("promotion-2", dish1, true);
      await change({ enable: false, configDiscount: { discountType: "percentage", discountAmount: 10, dishes: [dish1], groups: ["*"], excludeModifiers: true } });
      const id = await basket();
      expect(await discount(id)).to.equal(9);

      // 5.05 off the five Dish 1 instead of 5, and 4 off Dish 2
      expect((await apply(id, "CODE1")).discountTotal).to.equal(9.05);
      expect((await line(id, dish1)).discountId).to.equal("promotion-1");
    });
  });

  describe("its promotion switched off", function () {
    beforeEach(async function () {
      // 10% off each Dish 1
      await change({ enable: false, configDiscount: { discountType: "percentage", discountAmount: 10, dishes: [dish1], groups: ["*"], excludeModifiers: true } });
    });

    it("applies only through the code, to what it chooses", async function () {
      const id = await basket();
      expect(await discount(id)).to.equal(0);

      expect((await apply(id, "CODE1")).discountTotal).to.equal(5.05);
      expect((await line(id, dish2)).discountTotal).to.equal(0);
    });

    it("deleted, gives nothing through the code", async function () {
      await change({ isDeleted: true });
      expect((await apply(await basket(), "CODE1")).discountTotal).to.equal(0);
    });
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
