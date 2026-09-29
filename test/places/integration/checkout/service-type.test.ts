import { expect } from "chai";
import { resetDatabase } from "../../support/reset";
import { add, checkout, deliverTo, lines, newBasket, pickUpAt, thrown } from "../../support/storefront";

/**
 * Pickup and dine-in: the point the customer chose is the kitchen, whatever the
 * address would pick, so switching between delivery and a point, or between
 * points, moves the basket to that point's kitchen and drops what it does not
 * sell. A point that does not cook, or is closed, is refused at checkout.
 *
 *   City 1: Kitchen 1 in Zone 1 and Kitchen 2, both taking pickup and dine-in;
 *           Point 1, which hands orders over and does not cook.
 *   Dish 1 is sold at both kitchens, Dish 2 only at Kitchen 1.
 */
describe("Checkout: service type", function () {
  const ZONE_1 = [[9.9, 9.9], [10.05, 9.9], [10.05, 10.1], [9.9, 10.1], [9.9, 9.9]];
  const IN_ZONE_1 = { city: "City 1", formatted: "Street 1", home: "1", coordinate: { lat: 10.0, lon: 10.01 } };
  const DROPPED = "Some products are not available here and were removed: Dish 2";

  let kitchen1: string;
  let kitchen2: string;
  let point1: string;
  let dish1: string;
  let dish2: string;

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

    const group = await Group.create({ name: "Group 1", enable: true }).fetch();
    dish1 = (await Dish.create({ name: "Dish 1", price: 100, enable: true, parentGroup: group.id }).fetch()).id;
    dish2 = (await Dish.create({ name: "Dish 2", price: 100, enable: true, parentGroup: group.id }).fetch()).id;
    await DishPlace.create({ dish: dish2, place: kitchen2, localBalance: 0 }).fetch();
  });

  /** Dish 1 and Dish 2, delivered into Zone 1: at Kitchen 1. */
  async function basketAtKitchen1(): Promise<string> {
    const id = await newBasket();
    await add(id, dish1);
    await deliverTo(id, IN_ZONE_1);
    await add(id, dish2);
    return id;
  }

  const check = (id: string) => thrown(checkout(id));

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
});
