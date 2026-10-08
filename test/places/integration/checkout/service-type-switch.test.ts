import { expect } from "chai";
import { resetDatabase, withSettings } from "../../support/reset";
import { startBonusSystem, TestBonusSystem } from "../../support/bonus";
import { add, checkout, CUSTOMER, deliverTo, lines, newBasket, pickUpAt, thrown } from "../../support/storefront";

/**
 * Switching the service type past the plain moves `service-type` covers: a
 * point that does not serve the type asked for, a point in another city than
 * the address, an RMS stop at the new kitchen, a modifier the new kitchen
 * lacks, a zone minimum the basket falls under on the way back, a switch after
 * checkout, and what placing the order spends after a switch.
 *
 *   City 1: Kitchen 1 in Zone 1 (delivery 100, minimum 150), Kitchen 2;
 *           Point 2 cooks and takes pickup only, Point 3 cooks and seats only,
 *           Kitchen 4 is switched off.
 *   City 2: Kitchen 3.
 *
 *              Kitchen 1  Kitchen 2  Kitchen 3
 *   Dish 1     ∞          ∞          ∞
 *   Dish 2     ∞          0          0
 *   Dish 3     5          3          ∞
 *   Dish 4     ∞          RMS: 0     ∞
 *   Dish 5     ∞          ∞          ∞          offers Modifier 1 and Modifier 2
 *   Modifier 1 ∞          0          ∞
 *   Modifier 2 ∞          3          ∞
 */
describe("Checkout: switching the service type", function () {
  const ZONE_1 = [[9.9, 9.9], [10.05, 9.9], [10.05, 10.1], [9.9, 10.1], [9.9, 9.9]];
  const IN_ZONE_1 = { city: "City 1", formatted: "Street 1", home: "1", coordinate: { lat: 10.0, lon: 10.01 } };

  const k: Record<string, string> = {};
  const d: Record<string, string> = {};
  let group1: string;
  let system: TestBonusSystem;
  let bonusProgram: string;
  let user: any;

  before(async function () {
    await resetDatabase();
    ({ system, bonusProgram } = await startBonusSystem());
    user = await User.create({ firstName: "Customer", lastName: "1", phone: { code: "1", number: "5550000001" } }).fetch();
    await UserBonusProgram.registration(user, "bonus-1");
    system.balances.set(user.id, 1000);

    const city1 = (await City.create({ name: "City 1" }).fetch()).id;
    const city2 = (await City.create({ name: "City 2" }).fetch()).id;
    const point = async (title: string, city: string, lon: number, values: Record<string, unknown> = {}) =>
      (await Place.create({
        title, city, coordinate: { lat: 10.0, lon }, enable: true,
        isCookingPoint: true, isPickupPoint: true, hasDiningArea: true, ...values,
      }).fetch()).id;
    k.kitchen1 = await point("Kitchen 1", city1, 10.0);
    k.kitchen2 = await point("Kitchen 2", city1, 10.1);
    k.point2 = await point("Point 2", city1, 10.2, { hasDiningArea: false });
    k.point3 = await point("Point 3", city1, 10.3, { isPickupPoint: false });
    k.kitchen4 = await point("Kitchen 4", city1, 10.4, { enable: false });
    k.kitchen3 = await point("Kitchen 3", city2, 50.0);
    await DeliveryZone.create({ name: "Zone 1", polygon: ZONE_1, deliveryCost: 100, minDeliveryTime: 30, minOrderTotal: 150 }).fetch();

    group1 = (await Group.create({ name: "Group 1", enable: true }).fetch()).id;
    const dish = async (name: string, values: Record<string, unknown> = {}) =>
      (await Dish.create({ name, price: 100, enable: true, parentGroup: group1, ...values }).fetch()).id;
    for (const n of [1, 2, 3, 4]) d[`dish${n}`] = await dish(`Dish ${n}`);
    const group2 = (await Group.create({ name: "Group 2", enable: true }).fetch()).id;
    d.modifier1 = await dish("Modifier 1", { price: 10, modifier: true, parentGroup: group2 });
    d.modifier2 = await dish("Modifier 2", { price: 10, modifier: true, parentGroup: group2 });
    d.dish5 = await dish("Dish 5", { modifiers: [{ id: group2, childModifiers: [{ id: d.modifier1 }, { id: d.modifier2 }] }] });

    const rows: Array<[string, string, Record<string, number>]> = [
      [d.dish2, k.kitchen2, { localBalance: 0 }],
      [d.dish2, k.kitchen3, { localBalance: 0 }],
      [d.dish3, k.kitchen1, { localBalance: 5 }],
      [d.dish3, k.kitchen2, { localBalance: 3 }],
      [d.dish4, k.kitchen2, { rmsBalance: 0 }],
      [d.modifier1, k.kitchen2, { localBalance: 0 }],
      [d.modifier2, k.kitchen2, { localBalance: 3 }],
    ];
    for (const [dish, place, balance] of rows) await DishPlace.create({ dish, place, ...balance }).fetch();
  });

  /** Dish 1, delivered into Zone 1, then `extra`: all at Kitchen 1. */
  async function atKitchen1(...extra: Array<[string, number?]>): Promise<string> {
    const id = await newBasket();
    await add(id, d.dish1);
    await deliverTo(id, IN_ZONE_1);
    for (const [dish, amount] of extra) await add(id, dish, amount ?? 1);
    return id;
  }

  /** `amount` of Dish 5, each unit with `perUnit` of the modifier. */
  const addDish5 = (id: string, modifier: string, perUnit: number, amount = 1) =>
    Order.addDish({ id }, d.dish5, amount, [{ id: modifier, amount: perUnit }] as any, "", "user");

  const check = (id: string) => thrown(checkout(id));

  /** The names of Group 1 the storefront's menu offers for this order. */
  async function menuOf(id: string): Promise<string[]> {
    const { groups } = await Group.getGroups([group1], await Order.findOne({ id }));
    return groups[0].dishesList.map((dish: any) => dish.name).sort();
  }

  describe("a point that does not serve what was asked", function () {
    it("dine-in where there is no dining area: the point cooks, checkout refuses", async function () {
      const id = await atKitchen1();

      const order = await pickUpAt(id, k.point2, "dine-in");

      expect(order.cookingPoints).to.deep.equal([k.point2]);
      const refusal = await check(id);
      expect(refusal.code).to.equal(24);
      expect(refusal.error).to.contain("PLACE_NOT_SERVING");
    });

    it("pickup where there is no pickup: the point cooks, checkout refuses", async function () {
      const id = await atKitchen1();

      await pickUpAt(id, k.point3);

      const refusal = await check(id);
      expect(refusal.code).to.equal(24);
      expect(refusal.error).to.contain("PLACE_NOT_SERVING");
    });

    it("a point switched off gives no kitchen, and checkout calls it closed", async function () {
      const id = await atKitchen1();

      const order = await pickUpAt(id, k.kitchen4);

      expect(order.cookingPoints).to.deep.equal([]);
      expect(await check(id)).to.deep.equal({ code: 23, error: "PLACE_CLOSED" });
    });
  });

  it("a point in another city than the address: the point is the kitchen, its stock and menu count", async function () {
    const id = await atKitchen1([d.dish2]);

    const order = await pickUpAt(id, k.kitchen3);

    expect(order.cookingPoints).to.deep.equal([k.kitchen3]);
    expect(await lines(id)).to.deep.equal({ "Dish 1": 1 });
    expect(order.message).to.equal("Some products are not available here and were removed: Dish 2");
    expect(order.delivery).to.equal(null);
    expect(await menuOf(id)).to.not.include("Dish 2");
    expect(await check(id)).to.equal(null);
  });

  it("an RMS stop at the new kitchen drops the product in the modes that read the RMS", async function () {
    const id = await atKitchen1([d.dish4]);
    const order = await pickUpAt(id, k.kitchen2);

    expect(await lines(id)).to.deep.equal({ "Dish 1": 1 });
    expect(order.message).to.equal("Some products are not available here and were removed: Dish 4");
    expect(await menuOf(id)).to.not.include("Dish 4");

    await withSettings({ DISH_PLACE_BALANCE_MODE: "local-only" }, async () => {
      const kept = await atKitchen1([d.dish4]);
      await pickUpAt(kept, k.kitchen2);
      expect(await lines(kept)).to.deep.equal({ "Dish 1": 1, "Dish 4": 1 });
      expect(await menuOf(kept)).to.include("Dish 4");
    });
  });

  describe("a modifier the new kitchen lacks", function () {
    /** Dish 1 and `amount` of Dish 5 with `perUnit` of the modifier, delivered: at Kitchen 1. */
    async function withModifier(modifier: string, perUnit: number, amount = 1): Promise<string> {
      const id = await atKitchen1();
      await addDish5(id, modifier, perUnit, amount);
      return id;
    }

    it("none of it: the line goes whole, and the customer is told", async function () {
      const id = await withModifier(d.modifier1, 1);

      const order = await pickUpAt(id, k.kitchen2);

      expect(await lines(id)).to.deep.equal({ "Dish 1": 1 });
      expect(order.message).to.equal("Some products are not available here and were removed: Dish 5");
    });

    it("less of it: the line is cut to the units it has enough for, the modifier kept", async function () {
      // Two units, two of Modifier 2 each; Kitchen 2 has three — enough for one.
      const id = await withModifier(d.modifier2, 2, 2);

      await pickUpAt(id, k.kitchen2);

      const [line] = await OrderDish.find({ order: id, dish: d.dish5 });
      expect(line.amount).to.equal(1);
      expect(line.modifiers).to.deep.equal([{ id: d.modifier2, amount: 2 }]);
    });

    it("cannot be added there, counted over the whole basket", async function () {
      const id = await atKitchen1();
      await pickUpAt(id, k.kitchen2);

      expect(await thrown(addDish5(id, d.modifier1, 1))).to.be.instanceOf(Error);
      await addDish5(id, d.modifier2, 2);
      // One more unit would take four of the three.
      expect(await thrown(addDish5(id, d.modifier2, 2))).to.be.instanceOf(Error);
      expect(await lines(id)).to.deep.equal({ "Dish 1": 1, "Dish 5": 1 });
    });

    it("placing the order spends the modifier's stock at the kitchen", async function () {
      const id = await atKitchen1();
      await pickUpAt(id, k.kitchen2);
      await addDish5(id, d.modifier2, 2);
      await checkout(id);

      await Order.order({ id });

      expect((await DishPlace.findOne({ dish: d.modifier2, place: k.kitchen2 })).localBalance).to.equal(1);
    });
  });

  it("back to delivery under the zone minimum: delivery is not allowed and not charged, strict checkout refuses", async function () {
    const id = await atKitchen1([d.dish2]);
    await pickUpAt(id, k.kitchen2);

    const order = await deliverTo(id, IN_ZONE_1);

    expect(order.basketTotal).to.equal(100);
    expect(order.delivery).to.include({ allowed: false, message: "Minimum order amount: %s" });
    expect(order.total).to.equal(100);
    await withSettings({ SOFT_DELIVERY_CALCULATION: false }, async () => {
      expect(await check(id)).to.deep.equal({ code: 11, error: "Delivery not allowed" });
    });
  });

  it("after checkout: back to the basket, checked again at the new kitchen, bonuses counted from the new total", async function () {
    const spend = async (id: string) => {
      const order = await Order.findOne({ id });
      return Order.check({ id }, CUSTOMER, order.serviceType, order.address ?? undefined, undefined, user.id, { bonusProgramId: bonusProgram, amount: 1000 } as any);
    };
    const id = await atKitchen1([d.dish2]);
    await spend(id);
    expect(await Order.findOne({ id })).to.deep.include({ state: "CHECKOUT", basketTotal: 200, bonusesTotal: 150, total: 150 });

    expect((await pickUpAt(id, k.kitchen2)).state).to.equal("CART");

    await spend(id);
    expect(await Order.findOne({ id })).to.deep.include({ state: "CHECKOUT", cookingPoints: [k.kitchen2], basketTotal: 100, bonusesTotal: 50, total: 50 });
  });

  it("placing the order after a switch spends the new kitchen's stock", async function () {
    const id = await atKitchen1([d.dish3, 2]);
    await pickUpAt(id, k.kitchen2);
    await checkout(id);

    await Order.order({ id });

    expect((await Order.findOne({ id })).state).to.equal("ORDER");
    const stock = async (place: string) => (await DishPlace.findOne({ dish: d.dish3, place })).localBalance;
    expect([await stock(k.kitchen1), await stock(k.kitchen2)]).to.deep.equal([5, 1]);
  });
});
