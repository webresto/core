import { expect } from "chai";
import { getEffectiveBalanceAcross } from "../../../../lib/menu/product-availability";
import { resetDatabase } from "../../support/reset";
import { add, checkout, deliverTo, lines, newBasket, pickUpAt, thrown } from "../../support/storefront";

/**
 * Pickup and dine-in: the point the customer chose is the kitchen, whatever the
 * address would pick, so switching between delivery and a point, or between
 * points, moves the basket to that point's kitchen: what it does not sell is
 * dropped, what it has less of is cut to what it has, the totals and the menu
 * follow. A point that does not cook, or is closed, is refused at checkout.
 *
 *   City 1: Kitchen 1 in Zone 1 and Kitchen 2, both taking pickup and dine-in;
 *           Point 1, which hands orders over and does not cook.
 *
 *              Kitchen 1  Kitchen 2
 *   Dish 1     ∞          ∞
 *   Dish 2     ∞          0
 *   Dish 3     5          2
 */
describe("Checkout: service type", function () {
  const ZONE_1 = [[9.9, 9.9], [10.05, 9.9], [10.05, 10.1], [9.9, 10.1], [9.9, 9.9]];
  const IN_ZONE_1 = { city: "City 1", formatted: "Street 1", home: "1", coordinate: { lat: 10.0, lon: 10.01 } };
  const DROPPED = "Some products are not available here and were removed: Dish 2";
  /** Unlimited, as the menu reports it. */
  const ANY = -1;

  let kitchen1: string;
  let kitchen2: string;
  let point1: string;
  let group1: string;
  let dish1: string;
  let dish2: string;
  let dish3: string;
  /** Products of each `core:order-cooking-place-changed`, in the order they came. */
  const moved: string[][] = [];

  before(async function () {
    await resetDatabase();
    const city = await City.create({ name: "City 1" }).fetch();
    const point = async (title: string, coordinate: { lat: number; lon: number }, cooks: boolean) =>
      (await Place.create({
        title, city: city.id, coordinate, enable: true,
        isCookingPoint: cooks, isPickupPoint: true, hasDiningArea: true,
      }).fetch()).id;
    kitchen1 = await point("Kitchen 1", { lat: 10.0, lon: 10.0 }, true);
    kitchen2 = await point("Kitchen 2", { lat: 10.0, lon: 10.1 }, true);
    point1 = await point("Point 1", { lat: 10.0, lon: 10.02 }, false);
    await DeliveryZone.create({ name: "Zone 1", polygon: ZONE_1, deliveryCost: 100, minDeliveryTime: 30 }).fetch();

    group1 = (await Group.create({ name: "Group 1", enable: true }).fetch()).id;
    dish1 = (await Dish.create({ name: "Dish 1", price: 100, enable: true, parentGroup: group1 }).fetch()).id;
    dish2 = (await Dish.create({ name: "Dish 2", price: 100, enable: true, parentGroup: group1 }).fetch()).id;
    dish3 = (await Dish.create({ name: "Dish 3", price: 50, enable: true, parentGroup: group1 }).fetch()).id;
    for (const [dish, place, localBalance] of [[dish2, kitchen2, 0], [dish3, kitchen1, 5], [dish3, kitchen2, 2]] as const) {
      await DishPlace.create({ dish, place, localBalance }).fetch();
    }

    // `emitter.off` does not unsubscribe: one subscriber for the file.
    emitter.on("core:order-cooking-place-changed", "service-type-test", (_order: unknown, products: string[]) => {
      moved.push(products);
    });
  });

  beforeEach(function () {
    moved.length = 0;
  });

  /** Dish 1 and Dish 2, delivered into Zone 1: at Kitchen 1. */
  async function basketAtKitchen1(): Promise<string> {
    const id = await newBasket();
    await add(id, dish1);
    await deliverTo(id, IN_ZONE_1);
    await add(id, dish2);
    return id;
  }

  /** Dish 1 and three of Dish 3, delivered into Zone 1: at Kitchen 1, which has five. */
  async function threeOfDish3AtKitchen1(): Promise<string> {
    const id = await newBasket();
    await add(id, dish1);
    await deliverTo(id, IN_ZONE_1);
    await add(id, dish3, 3);
    return id;
  }

  const check = (id: string) => thrown(checkout(id));

  /** The event is sent detached: give it the time to arrive. */
  const settle = () => new Promise((resolve) => setTimeout(resolve, 50));

  /**
   * The menu the storefront reads for this order — `{ product: stock }` of
   * Group 1 as `Group.getGroups` builds it, at the order's own context.
   */
  async function menuOf(id: string): Promise<Record<string, number>> {
    const order = await Order.findOne({ id });
    const { groups } = await Group.getGroups([group1], order);
    const context = await (await Adapter.get("menu")).resolveContext({ order });
    const out: Record<string, number> = {};
    for (const dish of groups[0].dishesList) out[dish.name] = await getEffectiveBalanceAcross(dish.id!, context);
    return out;
  }

  it("pickup at another kitchen drops what it does not sell, and leaves no delivery", async function () {
    const id = await basketAtKitchen1();
    const order = await pickUpAt(id, kitchen2);

    expect(order.cookingPoints).to.deep.equal([kitchen2]);
    expect(await lines(id)).to.deep.equal({ "Dish 1": 1 });
    expect(order.message).to.equal(DROPPED);
    expect(order.delivery).to.equal(null);
    expect(await check(id)).to.equal(null);
  });

  it("pickup and dine-in at the kitchen the address picked keep everything", async function () {
    const id = await basketAtKitchen1();

    await pickUpAt(id, kitchen1);
    expect(await lines(id)).to.deep.equal({ "Dish 1": 1, "Dish 2": 1 });
    const order = await pickUpAt(id, kitchen1, "dine-in");
    expect(order.cookingPoints).to.deep.equal([kitchen1]);
    expect(await lines(id)).to.deep.equal({ "Dish 1": 1, "Dish 2": 1 });
    expect(await check(id)).to.equal(null);
  });

  it("back to delivery: the kitchen follows the address again, and what was dropped stays dropped", async function () {
    const id = await basketAtKitchen1();
    await pickUpAt(id, kitchen2);

    const order = await deliverTo(id, IN_ZONE_1);

    expect(order.cookingPoints).to.deep.equal([kitchen1]);
    expect(await lines(id)).to.deep.equal({ "Dish 1": 1 });
  });

  it("from one pickup point to another, the kitchen moves with the customer", async function () {
    const id = await newBasket();
    await add(id, dish1);
    await pickUpAt(id, kitchen1);
    await add(id, dish2);

    const order = await pickUpAt(id, kitchen2);

    expect(order.cookingPoints).to.deep.equal([kitchen2]);
    expect(await lines(id)).to.deep.equal({ "Dish 1": 1 });
    expect(order.message).to.equal(DROPPED);
  });

  it("a pickup point that does not cook gives no kitchen, keeps what every kitchen of the city has, and is refused", async function () {
    const id = await basketAtKitchen1();
    const order = await pickUpAt(id, point1);

    expect(order.cookingPoints).to.deep.equal([]);
    // No kitchen: the basket is read at every kitchen of its city.
    expect(await lines(id)).to.deep.equal({ "Dish 1": 1 });
    const refusal = await check(id);
    expect(refusal.code).to.equal(24);
    expect(refusal.error).to.contain("PLACE_NOT_SERVING");
  });

  it("a closed pickup point is refused as closed", async function () {
    const id = await newBasket();
    await add(id, dish1);
    await pickUpAt(id, kitchen1);
    const closed = [{ dayOfWeek: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"], start: "00:00", stop: "00:01" }];
    await Place.update({ id: kitchen1 }, { worktime: closed }).fetch();

    try {
      expect(await check(id)).to.deep.equal({ code: 23, error: "PLACE_CLOSED" });
    } finally {
      await Place.update({ id: kitchen1 }, { worktime: null }).fetch();
    }
  });

  it("a kitchen that closes keeps the basket: its menu is empty, nothing more goes in, checkout refuses it as closed", async function () {
    const id = await basketAtKitchen1();
    await pickUpAt(id, kitchen1);
    const closed = [{ dayOfWeek: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"], start: "00:00", stop: "00:01" }];
    await Place.update({ id: kitchen1 }, { worktime: closed }).fetch();
    try {
      const order = await pickUpAt(id, kitchen1);

      expect(await lines(id)).to.deep.equal({ "Dish 1": 1, "Dish 2": 1 });
      expect(order.message).to.equal("");
      expect((await Order.populate({ id })).dishes).to.have.length(2);
      expect(await menuOf(id)).to.deep.equal({});
      expect(String(await thrown(add(id, dish1)))).to.contain("PLACE_CLOSED");
      expect(await check(id)).to.deep.equal({ code: 23, error: "PLACE_CLOSED" });
    } finally {
      await Place.update({ id: kitchen1 }, { worktime: null }).fetch();
    }

    await add(id, dish1);
    expect(await lines(id)).to.deep.equal({ "Dish 1": 2, "Dish 2": 1 });
  });

  it("dine-in at another kitchen moves the basket the way pickup does, from delivery or from a pickup", async function () {
    const fromDelivery = await basketAtKitchen1();
    const order = await pickUpAt(fromDelivery, kitchen2, "dine-in");
    expect(order.cookingPoints).to.deep.equal([kitchen2]);
    expect(await lines(fromDelivery)).to.deep.equal({ "Dish 1": 1 });
    expect(order.message).to.equal(DROPPED);
    expect(order.delivery).to.equal(null);
    expect(await check(fromDelivery)).to.equal(null);

    const fromPickup = await basketAtKitchen1();
    await pickUpAt(fromPickup, kitchen1);
    expect((await pickUpAt(fromPickup, kitchen2, "dine-in")).cookingPoints).to.deep.equal([kitchen2]);
    expect(await lines(fromPickup)).to.deep.equal({ "Dish 1": 1 });
  });

  describe("stock", function () {
    it("a kitchen with less of a product cuts its line to what it has", async function () {
      const id = await threeOfDish3AtKitchen1();

      const order = await pickUpAt(id, kitchen2);

      expect(await lines(id)).to.deep.equal({ "Dish 1": 1, "Dish 3": 2 });
      expect(order.basketTotal).to.equal(100 + 2 * 50);
    });

    it("what was cut stays cut on the way back", async function () {
      const id = await threeOfDish3AtKitchen1();
      await pickUpAt(id, kitchen2);

      await deliverTo(id, IN_ZONE_1);

      expect(await lines(id)).to.deep.equal({ "Dish 1": 1, "Dish 3": 2 });
    });

    it("a point that does not cook reads the tightest stock of the city's kitchens", async function () {
      const id = await threeOfDish3AtKitchen1();

      await pickUpAt(id, point1);

      expect(await lines(id)).to.deep.equal({ "Dish 1": 1, "Dish 3": 2 });
    });
  });

  describe("totals", function () {
    it("delivery is charged, then dropped at pickup, then charged again; the total follows the basket", async function () {
      const id = await basketAtKitchen1();
      let order = await deliverTo(id, IN_ZONE_1);
      expect(order.delivery?.cost).to.equal(100);
      expect([order.basketTotal, order.total]).to.deep.equal([200, 300]);

      order = await pickUpAt(id, kitchen2);
      expect(order.delivery).to.equal(null);
      expect([order.basketTotal, order.total]).to.deep.equal([100, 100]);

      order = await deliverTo(id, IN_ZONE_1);
      expect(order.delivery?.cost).to.equal(100);
      expect([order.basketTotal, order.total]).to.deep.equal([100, 200]);
    });
  });

  describe("menu", function () {
    it("is read at the kitchen the order moved to, and back", async function () {
      const id = await basketAtKitchen1();
      expect(await menuOf(id)).to.deep.equal({ "Dish 1": ANY, "Dish 2": ANY, "Dish 3": 5 });

      await pickUpAt(id, kitchen2);
      expect(await menuOf(id)).to.deep.equal({ "Dish 1": ANY, "Dish 3": 2 });

      // The menu offers again what the basket lost on the way.
      await deliverTo(id, IN_ZONE_1);
      expect(await menuOf(id)).to.deep.equal({ "Dish 1": ANY, "Dish 2": ANY, "Dish 3": 5 });
    });

    it("dine-in reads the same menu as pickup at the same kitchen", async function () {
      const id = await basketAtKitchen1();
      await pickUpAt(id, kitchen2);
      const pickup = await menuOf(id);

      await pickUpAt(id, kitchen2, "dine-in");

      expect(await menuOf(id)).to.deep.equal(pickup);
    });

    it("at a point that does not cook is the intersection of the city's kitchens", async function () {
      const id = await basketAtKitchen1();

      await pickUpAt(id, point1);

      expect(await menuOf(id)).to.deep.equal({ "Dish 1": ANY, "Dish 3": 2 });
    });
  });

  describe("core:order-cooking-place-changed", function () {
    it("names what the new kitchen stopped", async function () {
      const id = await basketAtKitchen1();

      await pickUpAt(id, kitchen2);
      await settle();

      expect(moved).to.deep.equal([["Dish 2"]]);
    });

    it("is not sent when the kitchen stays, whatever the service type", async function () {
      const id = await basketAtKitchen1();

      await pickUpAt(id, kitchen1);
      await pickUpAt(id, kitchen1, "dine-in");
      await deliverTo(id, IN_ZONE_1);
      await settle();

      expect(moved).to.deep.equal([]);
    });

    it("is not sent for a line only cut: the product came along", async function () {
      const id = await threeOfDish3AtKitchen1();

      await pickUpAt(id, kitchen2);
      await settle();

      expect(moved).to.deep.equal([]);
    });
  });
});
