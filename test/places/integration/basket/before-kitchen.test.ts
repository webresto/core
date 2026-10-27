import { expect } from "chai";
import { KITCHEN_LOG } from "../../../../lib/order/kitchen-assignment";
import { resetDatabase, withSettings } from "../../support/reset";
import { add, deliverTo, lines, newBasket, thrown, updateOrder } from "../../support/storefront";

/**
 * A basket that has no kitchen yet takes what any kitchen it could end up at
 * can sell, up to the best of their stock: with no city, every kitchen of every
 * city; with a city, that city's. The kitchen an address or a switch of city
 * picks drops what it lacks, and says so. With no kitchen at all, the default
 * mode lets everything in and single-place mode nothing.
 *
 *              Kitchen 1  Kitchen 2  Kitchen 3
 *   Dish 1     ∞          ∞          ∞
 *   Dish 2     ∞          0          0          only Kitchen 1
 *   Dish 3     ∞          ∞          0          not in City 2
 *   Dish 4     2          5          ∞
 *   Dish 5     0          ∞          ∞          not at Kitchen 1
 *
 *   City 1: Kitchen 1 in Zone 1, Kitchen 2. City 2: Kitchen 3.
 */
describe("Basket before a kitchen", function () {
  const IN_ZONE_1 = { city: "City 1", formatted: "Street 1", home: "1", coordinate: { lat: 10.0, lon: 10.01 } };
  const k: Record<string, string> = {};
  const d: Record<string, string> = {};
  const moved: unknown[][] = [];

  before(async function () {
    await resetDatabase();
    const city1 = (await City.create({ name: "City 1" }).fetch()).id;
    const city2 = (await City.create({ name: "City 2" }).fetch()).id;
    const kitchen = async (title: string, city: string, coordinate: { lat: number; lon: number }) =>
      (await Place.create({ title, city, coordinate, enable: true, isCookingPoint: true, isPickupPoint: true }).fetch()).id;
    k.kitchen1 = await kitchen("Kitchen 1", city1, { lat: 10.0, lon: 10.0 });
    k.kitchen2 = await kitchen("Kitchen 2", city1, { lat: 10.0, lon: 10.1 });
    k.kitchen3 = await kitchen("Kitchen 3", city2, { lat: 50.0, lon: 50.0 });
    await DeliveryZone.create({ name: "Zone 1", polygon: [[9.9, 9.9], [10.05, 9.9], [10.05, 10.1], [9.9, 10.1], [9.9, 9.9]], deliveryCost: 100, minDeliveryTime: 30 }).fetch();

    const group = await Group.create({ name: "Group 1", enable: true }).fetch();
    for (const n of [1, 2, 3, 4, 5]) d[`dish${n}`] = (await Dish.create({ name: `Dish ${n}`, price: 100, enable: true, parentGroup: group.id }).fetch()).id;
    const stock = (dish: string, place: string, localBalance: number) => DishPlace.create({ dish, place, localBalance }).fetch();
    await stock(d.dish2, k.kitchen2, 0);
    await stock(d.dish2, k.kitchen3, 0);
    await stock(d.dish3, k.kitchen3, 0);
    await stock(d.dish4, k.kitchen1, 2);
    await stock(d.dish4, k.kitchen2, 5);
    await stock(d.dish5, k.kitchen1, 0);

    // `emitter.off` does not unsubscribe: one subscriber for the file.
    emitter.on("core:order-cooking-place-changed", "before-kitchen-test", (...args: unknown[]) => {
      moved.push(args);
    });
  });

  beforeEach(function () {
    moved.length = 0;
  });

  const inCity = (id: string, city: string) => updateOrder(id, { serviceType: "delivery", address: { city }, pickupPoint: null });
  const refused = async (id: string, dish: string) => (await thrown(add(id, dish))) !== null;

  it("with no city, takes what any kitchen of any city can sell", async function () {
    const id = await newBasket();
    await add(id, d.dish1);
    await add(id, d.dish2);
    await add(id, d.dish3);
    // Kitchen 3 sets Dish 4 no ceiling.
    await add(id, d.dish4, 6);

    expect(await lines(id)).to.deep.equal({ "Dish 1": 1, "Dish 2": 1, "Dish 3": 1, "Dish 4": 6 });
    expect((await Order.findOne({ id })).cookingPoints).to.deep.equal([]);
  });

  it("with a city, takes what any kitchen of that city can sell, up to the best stock", async function () {
    const id = await newBasket();
    await add(id, d.dish1);
    await inCity(id, "City 1");

    await add(id, d.dish2);
    await add(id, d.dish4, 5);
    expect(await lines(id)).to.deep.equal({ "Dish 1": 1, "Dish 2": 1, "Dish 4": 5 });
    // Kitchen 2's five are the ceiling, and the five in the basket count.
    expect((await thrown(add(id, d.dish4))).message).to.contain("Available quantity: 5");
    expect((await Order.findOne({ id })).cookingPoints).to.deep.equal([]);
  });

  it("takes what one kitchen stops and another sells; the kitchen the address picks drops it, and says so — in both modes", async function () {
    for (const mode of ["default", "single-place"]) {
      await withSettings({ MENU_PLACE_BASED_MODE: mode }, async () => {
        const id = await newBasket();
        await add(id, d.dish1);
        await inCity(id, "City 1");
        await add(id, d.dish5);
        expect(await lines(id), mode).to.deep.equal({ "Dish 1": 1, "Dish 5": 1 });

        // Zone 1 is Kitchen 1's, which stops Dish 5.
        const order = await deliverTo(id, IN_ZONE_1);

        expect(order.cookingPoints, mode).to.deep.equal([k.kitchen1]);
        expect(await lines(id), mode).to.deep.equal({ "Dish 1": 1 });
        expect(order.message, mode).to.equal("Some products are not available here and were removed: Dish 5");
      });
    }
  });

  it("switching the city without an address drops what the new city lacks, and says so", async function () {
    const id = await newBasket();
    await add(id, d.dish1);
    await inCity(id, "City 1");
    // Two kitchens and no coordinate: nothing to choose by.
    expect((await Order.findOne({ id })).cookingPoints).to.deep.equal([]);
    await add(id, d.dish3);

    const order = await inCity(id, "City 2");

    expect(await lines(id)).to.deep.equal({ "Dish 1": 1 });
    expect(order.message).to.equal("Some products are not available here and were removed: Dish 3");
    expect((await Order.getLogs({ id })).filter((entry) => entry.message === KITCHEN_LOG.dropped)).to.have.length(1);
    // City 2 has one kitchen, and `single-point` names it without a coordinate.
    expect(order.cookingPoints).to.deep.equal([k.kitchen3]);
  });

  it("an address with no coordinate still reads the basket at the kitchens of its city", async function () {
    await withSettings({ SOFT_DELIVERY_CALCULATION: false }, async () => {
      const id = await newBasket();
      await add(id, d.dish1);
      await deliverTo(id, { city: "City 1", formatted: "Street 1", home: "1" });

      expect((await Order.findOne({ id })).cookingPoints).to.deep.equal([]);
      await add(id, d.dish4, 5);
      // Kitchen 2's five: the unlimited Kitchen 3 is in another city.
      expect(await refused(id, d.dish4)).to.equal(true);
      expect(await lines(id)).to.deep.equal({ "Dish 1": 1, "Dish 4": 5 });
    });
  });

  describe("with no kitchen anywhere", function () {
    async function noKitchen(run: () => Promise<void>) {
      for (const id of Object.values(k)) await Place.update({ id }, { isCookingPoint: false }).fetch();
      try {
        await run();
      } finally {
        for (const id of Object.values(k)) await Place.update({ id }, { isCookingPoint: true }).fetch();
      }
    }

    it("the default mode does not know the stock and lets everything in", async function () {
      await noKitchen(async () => {
        const id = await newBasket();
        await add(id, d.dish2);
        expect(await lines(id)).to.deep.equal({ "Dish 2": 1 });
      });
    });

    it("single-place mode lets nothing in", async function () {
      await withSettings({ MENU_PLACE_BASED_MODE: "single-place" }, () => noKitchen(async () => {
        const id = await newBasket();
        expect((await thrown(add(id, d.dish1))).message).to.contain("MENU_PLACE_REQUIRED");
      }));
    });
  });
});
