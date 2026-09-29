import { expect } from "chai";
import { KITCHEN_LOG } from "../../../../lib/order/kitchen-assignment";
import { nominatim } from "../../support/nominatim";
import { resetDatabase, withSettings } from "../../support/reset";
import { add, checkout, deliverTo, lines, newBasket, thrown, updateOrder } from "../../support/storefront";

/**
 * Delivery: the address picks the zone, the zone picks the kitchen that stands
 * in it, and the kitchen decides what the basket may hold and what checkout
 * charges.
 *
 *   City 1: Kitchen 1 in Zone 1 (delivery 100), Kitchen 2 in Zone 2 (delivery 150).
 *   Dish 1 is sold at both kitchens, Dish 2 only at Kitchen 1.
 *   Dish 3 cooks for 20 minutes, Dish 4 for 60.
 */
describe("checkout: delivery", function () {
  // Zone rings are [lon, lat].
  const ZONE_1 = [[9.9, 9.9], [10.05, 9.9], [10.05, 10.1], [9.9, 10.1], [9.9, 9.9]];
  const ZONE_2 = [[10.05, 9.9], [10.2, 9.9], [10.2, 10.1], [10.05, 10.1], [10.05, 9.9]];
  const IN_ZONE_1 = { lat: 10.0, lon: 10.01 };
  const IN_ZONE_2 = { lat: 10.0, lon: 10.09 };
  /** In City 1, in no zone; Kitchen 2 is the nearer kitchen. */
  const OUTSIDE = { lat: 10.0, lon: 10.4 };

  let kitchen1: string;
  let kitchen2: string;

  const at = (coordinate: { lat: number; lon: number } | null) => ({
    city: "City 1",
    formatted: "Street 1",
    home: "1",
    ...(coordinate && { coordinate }),
  });

  before(async function () {
    await resetDatabase();

    const city = await City.create({ name: "City 1" }).fetch();
    const kitchen = (title: string, coordinate: { lat: number; lon: number }) =>
      Place.create({
        title, city: city.id, coordinate, enable: true,
        isCookingPoint: true, isPickupPoint: true, hasDiningArea: false,
      }).fetch();
    kitchen1 = (await kitchen("Kitchen 1", { lat: 10.0, lon: 10.0 })).id;
    kitchen2 = (await kitchen("Kitchen 2", { lat: 10.0, lon: 10.1 })).id;

    await DeliveryZone.create({ name: "Zone 1", polygon: ZONE_1, deliveryCost: 100, minDeliveryTime: 30 }).fetch();
    await DeliveryZone.create({ name: "Zone 2", polygon: ZONE_2, deliveryCost: 150, minDeliveryTime: 30 }).fetch();

    const group = await Group.create({ name: "Group 1" }).fetch();
    await Dish.create({ name: "Dish 1", price: 100, enable: true, parentGroup: group.id }).fetch();
    const dish2 = await Dish.create({ name: "Dish 2", price: 100, enable: true, parentGroup: group.id }).fetch();
    await DishPlace.create({ dish: dish2.id, place: kitchen2, localBalance: 0 }).fetch();
    await Dish.create({ name: "Dish 3", price: 100, enable: true, parentGroup: group.id, cookingTimeMax: 20 }).fetch();
    await Dish.create({ name: "Dish 4", price: 100, enable: true, parentGroup: group.id, cookingTimeMax: 60 }).fetch();
  });

  const dishId = async (name: string) => (await Dish.findOne({ name })).id;

  /** Runs `run` with the kitchens changed, and puts them back after. */
  async function withKitchens<T>(changes: Record<string, Record<string, unknown>>, run: () => Promise<T>): Promise<T> {
    const saved = new Map<string, any>();
    for (const [id, values] of Object.entries(changes)) {
      saved.set(id, await Place.findOne({ id }));
      await Place.update({ id }, values).fetch();
    }
    try {
      return await run();
    } finally {
      for (const [id, place] of saved) {
        await Place.update({ id }, { enable: place.enable, worktime: place.worktime, isCookingPoint: place.isCookingPoint }).fetch();
      }
    }
  }
  const CLOSED = [{ dayOfWeek: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"], start: "00:00", stop: "00:01" }];

  it("an address in a zone assigns the kitchen standing in it, and checkout charges the zone", async function () {
    const id = await newBasket();
    await add(id, await dishId("Dish 1"));
    let order = await deliverTo(id, at(IN_ZONE_1));

    expect(order.cookingPoints).to.deep.equal([kitchen1]);
    const assigned = (await Order.getLogs({ id })).find((entry) => entry.message === KITCHEN_LOG.assigned);
    expect(assigned?.data).to.deep.include({ to: kitchen1, strategy: "delivery-zone" });

    // Kitchen 1 sells Dish 2; before a kitchen the basket could not take it.
    await add(id, await dishId("Dish 2"), 2);
    expect(await thrown(checkout(id))).to.equal(null);

    order = await Order.findOne({ id });
    expect(order.state).to.equal("CHECKOUT");
    expect(order.delivery).to.include({ allowed: true, cost: 100, zoneName: "Zone 1" });
    expect(order.basketTotal).to.equal(300);
    expect(order.total).to.equal(400);
  });

  it("moving the address to another zone moves the kitchen and drops what it does not sell", async function () {
    const id = await newBasket();
    await add(id, await dishId("Dish 1"));
    await deliverTo(id, at(IN_ZONE_1));
    await add(id, await dishId("Dish 2"));

    const order = await deliverTo(id, at(IN_ZONE_2));

    expect(order.cookingPoints).to.deep.equal([kitchen2]);
    expect(await lines(id)).to.deep.equal({ "Dish 1": 1 });
    expect(order.message).to.equal("Some products are not available here and were removed: Dish 2");
    expect(order.delivery).to.include({ cost: 150, zoneName: "Zone 2" });
  });

  it("a kitchen switched off after it was assigned hands the basket to the next one", async function () {
    const id = await newBasket();
    await add(id, await dishId("Dish 1"));
    await deliverTo(id, at(IN_ZONE_1));
    await add(id, await dishId("Dish 2"));

    await withKitchens({ [kitchen1]: { enable: false } }, async () => {
      const order = await updateOrder(id, {});

      // Zone 1 has no open kitchen left: the nearest one takes it.
      expect(order.cookingPoints).to.deep.equal([kitchen2]);
      expect(await lines(id)).to.deep.equal({ "Dish 1": 1 });
      expect(order.message).to.equal("Some products are not available here and were removed: Dish 2");
    });
  });

  it("with a maximum wait, refuses a product that alone cooks longer, and a promise longer than the wait", async function () {
    const id = await newBasket();
    await add(id, await dishId("Dish 1"));
    await deliverTo(id, at(IN_ZONE_1));
    await updateOrder(id, { maxWaitMinutes: 30 });

    expect((await thrown(add(id, await dishId("Dish 4")))).code).to.equal(25);
    // 20 minutes of cooking and the zone's 30 minutes on the road.
    await add(id, await dishId("Dish 3"));
    expect((await thrown(checkout(id))).code).to.equal(21);
  });

  it("an address the geocoder cannot place has no kitchen; soft calculation takes it for an operator to price", async function () {
    const id = await newBasket();
    await add(id, await dishId("Dish 1"));
    const order = await deliverTo(id, at(null));

    expect(order.cookingPoints).to.deep.equal([]);
    expect(nominatim.requests.map((request) => request.path)).to.include("search");
    expect(await thrown(checkout(id))).to.equal(null);
    expect(await Order.findOne({ id })).to.deep.include({ state: "CHECKOUT" });
    expect((await Order.findOne({ id })).delivery).to.include({ allowed: true, cost: null });
  });

  describe("soft calculation off", function () {
    before(async function () {
      await Settings.set("SOFT_DELIVERY_CALCULATION", { value: false });
    });

    after(async function () {
      await Settings.set("SOFT_DELIVERY_CALCULATION", { value: true });
    });

    it("an address in no zone goes to the nearest kitchen, and the delivery is refused", async function () {
      const id = await newBasket();
      await add(id, await dishId("Dish 1"));
      await deliverTo(id, at(OUTSIDE));

      expect((await Order.findOne({ id })).cookingPoints).to.deep.equal([kitchen2]);
      expect(await thrown(checkout(id))).to.deep.equal({ code: 11, error: "Delivery not allowed" });
    });

    it("an address the geocoder cannot place is refused for having no kitchen", async function () {
      const id = await newBasket();
      await add(id, await dishId("Dish 1"));
      await deliverTo(id, at(null));

      expect(await thrown(checkout(id))).to.deep.equal({ code: 26, error: "NO_KITCHEN" });
      expect((await Order.findOne({ id })).state).to.equal("CART");
    });

    /** A basket with Dish 1 delivered to `coordinate`: its kitchens, and what checkout says. */
    async function delivered(coordinate: { lat: number; lon: number } | null) {
      const id = await newBasket();
      await add(id, await dishId("Dish 1"));
      const order = await deliverTo(id, at(coordinate));
      return { kitchens: order.cookingPoints, refusal: await thrown(checkout(id)) };
    }

    it("every kitchen closed: nobody takes it", async function () {
      await withKitchens({ [kitchen1]: { worktime: CLOSED }, [kitchen2]: { worktime: CLOSED } }, async () => {
        expect(await delivered(IN_ZONE_1)).to.deep.equal({ kitchens: [], refusal: { code: 26, error: "NO_KITCHEN" } });
      });
    });

    it("beyond the radius cap and in no zone: nobody takes it", async function () {
      await withSettings({ DELIVERY_MAX_RADIUS_KM: 1 }, async () => {
        expect(await delivered(OUTSIDE)).to.deep.equal({ kitchens: [], refusal: { code: 26, error: "NO_KITCHEN" } });
      });
    });

    it("an empty chain names no kitchen for a delivery", async function () {
      await withSettings({ KITCHEN_RESOLVE_CHAIN: [] }, async () => {
        expect(await delivered(IN_ZONE_1)).to.deep.equal({ kitchens: [], refusal: { code: 26, error: "NO_KITCHEN" } });
      });
    });

    it("with one kitchen, the default chain gives it any delivery, coordinate or not", async function () {
      await withKitchens({ [kitchen2]: { isCookingPoint: false } }, async () => {
        const id = await newBasket();
        await add(id, await dishId("Dish 1"));
        const order = await deliverTo(id, at(null));

        expect(order.cookingPoints).to.deep.equal([kitchen1]);
        const assigned = (await Order.getLogs({ id })).find((entry) => entry.message === KITCHEN_LOG.assigned);
        expect(assigned?.data.strategy).to.equal("single-point");
      });
    });
  });
});
