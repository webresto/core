import { expect } from "chai";
import { deliveryForAddress, KITCHEN_LOG } from "../../../../lib/order/kitchen-assignment";
import { geocoder } from "../../support/geocoder";
import { resetDatabase, withSettings } from "../../support/reset";
import { add, checkout, deliverTo, lines, newBasket, pickUpAt, thrown, updateOrder } from "../../support/storefront";
import { OrderHelper } from "../../../../lib/order/OrderHelper";

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
    expect(geocoder.requests.map((request) => request.method)).to.include("house");
    expect(await thrown(checkout(id))).to.equal(null);
    expect(await Order.findOne({ id })).to.deep.include({ state: "CHECKOUT" });
    expect((await Order.findOne({ id })).delivery).to.include({ allowed: true, cost: null });
  });

  it("with soft calculation the answer about an address does not ask the kitchens: an operator finds one", async function () {
    await withKitchens({ [kitchen1]: { enable: false }, [kitchen2]: { enable: false } }, async () => {
      const delivery = await deliveryForAddress(at(IN_ZONE_2));
      expect(delivery.allowed).to.equal(true);
      expect(delivery).to.not.have.property("kitchenOpensAt");
    });
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

    it("every kitchen closed: nobody takes it now, a dish still goes in, the basket stays, \"as soon as possible\" is refused", async function () {
      const id = await newBasket();
      await add(id, await dishId("Dish 1"));
      await withKitchens({ [kitchen1]: { worktime: CLOSED }, [kitchen2]: { worktime: CLOSED } }, async () => {
        const order = await deliverTo(id, at(IN_ZONE_1));

        expect(order.cookingPoints).to.deep.equal([]);
        expect(await lines(id)).to.deep.equal({ "Dish 1": 1 });
        await add(id, await dishId("Dish 1"));
        expect(await lines(id)).to.deep.equal({ "Dish 1": 2 });
        expect(await thrown(checkout(id))).to.deep.equal({ code: 26, error: "NO_KITCHEN" });
      });
    });

    it("every kitchen closed now: an order by a time they work at gets the kitchen of its zone", async function () {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const day = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;
      // two hours away from now either way: closed now, open at the time of the order
      const [start, stop, time] = new Date().getHours() < 12 ? ["14:00", "16:00", "15:00"] : ["03:00", "05:00", "04:00"];
      const LATER = [{ dayOfWeek: CLOSED[0].dayOfWeek, start, stop }];
      const id = await newBasket();
      await add(id, await dishId("Dish 1"));
      await withKitchens({ [kitchen1]: { worktime: LATER }, [kitchen2]: { worktime: LATER } }, async () => {
        await updateOrder(id, { date: `${day} ${time}` });
        expect((await deliverTo(id, at(IN_ZONE_2))).cookingPoints).to.deep.equal([kitchen2]);
      });
    });

    it("the answer about an address says when its kitchen opens, and refuses one no kitchen takes within a week", async function () {
      // two hours away from now either way: closed now, open later - today, or tomorrow at night
      const afternoon = new Date().getHours() < 12;
      const [start, stop] = afternoon ? ["14:00", "16:00"] : ["03:00", "05:00"];
      const opens = new Date();
      if (!afternoon) opens.setDate(opens.getDate() + 1);
      const day = `${opens.getFullYear()}-${String(opens.getMonth() + 1).padStart(2, "0")}-${String(opens.getDate()).padStart(2, "0")}`;
      const LATER = [{ dayOfWeek: CLOSED[0].dayOfWeek, start, stop }];

      expect((await deliveryForAddress(at(IN_ZONE_2))).kitchenOpensAt).to.equal(null);
      await withKitchens({ [kitchen1]: { worktime: LATER }, [kitchen2]: { worktime: LATER } }, async () => {
        expect(await deliveryForAddress(at(IN_ZONE_2))).to.include({ allowed: true, kitchenOpensAt: `${day} ${start}` });
      });
      await withKitchens({ [kitchen1]: { enable: false }, [kitchen2]: { enable: false } }, async () => {
        expect(await deliveryForAddress(at(IN_ZONE_2))).to.include({ allowed: false, message: "No kitchen delivers to this address now" });
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

    it("with one kitchen, closed at the moment of the order, nobody takes a delivery", async function () {
      const id = await newBasket();
      await add(id, await dishId("Dish 1"));
      await withKitchens({ [kitchen2]: { isCookingPoint: false }, [kitchen1]: { worktime: CLOSED } }, async () => {
        expect((await deliverTo(id, at(null))).cookingPoints).to.deep.equal([]);
        expect(await thrown(checkout(id))).to.deep.equal({ code: 26, error: "NO_KITCHEN" });
      });
    });

    it("the kitchen of a basket closed: adding a dish recounts the basket, and an open kitchen takes it", async function () {
      const id = await newBasket();
      await add(id, await dishId("Dish 1"));
      expect((await deliverTo(id, at(IN_ZONE_1))).cookingPoints).to.deep.equal([kitchen1]);
      await withKitchens({ [kitchen1]: { worktime: CLOSED } }, async () => {
        await add(id, await dishId("Dish 1"));

        expect((await Order.findOne({ id })).cookingPoints).to.deep.equal([kitchen2]);
        expect(await lines(id)).to.deep.equal({ "Dish 1": 2 });
      });
    });

    /** When an order can be had - initCheckout: the hours of the kitchens that take its address, or of its point. */
    describe("when the order can be had", function () {
      const seconds = (moment: Date) => Math.floor(moment.getTime() / 1000);
      /** The next `time` today or tomorrow, by the process clock - the restaurant's. */
      function next(time: string): Date {
        const [hour, minute] = time.split(":").map(Number);
        const moment = new Date();
        moment.setHours(hour, minute, 0, 0);
        if (moment.getTime() <= Date.now()) moment.setDate(moment.getDate() + 1);
        return moment;
      }
      // two hours away from now either way: closed now, open later - today, or tomorrow at night
      const [start, stop] = new Date().getHours() < 12 ? ["14:00", "16:00"] : ["03:00", "05:00"];
      const LATER = [{ dayOfWeek: CLOSED[0].dayOfWeek, start, stop }];
      const initCheckout = async (id: string) => OrderHelper.initCheckout(await Order.populate({ id }));
      const limitSeconds = async () => Number(await Settings.get("POSSIBLE_TO_ORDER_IN_MINUTES")) * 60;

      it("a kitchen takes the address now and all along: one interval from now to the limit", async function () {
        const id = await newBasket();
        await add(id, await dishId("Dish 1"));
        await deliverTo(id, at(IN_ZONE_2));
        const answer = await initCheckout(id);

        expect(answer).to.include({ allowSoonAsPossible: true, allowOrderToTime: true });
        expect(answer.worktimeIntervals).to.have.length(1);
        const [[from, to]] = answer.worktimeIntervals;
        expect(from).to.be.closeTo(seconds(new Date()), 5);
        expect(to - from).to.be.closeTo(await limitSeconds(), 5);
      });

      it("the kitchens of the address work later: a window a day, not now", async function () {
        const id = await newBasket();
        await add(id, await dishId("Dish 1"));
        await withKitchens({ [kitchen1]: { worktime: LATER }, [kitchen2]: { worktime: LATER } }, async () => {
          await deliverTo(id, at(IN_ZONE_2));
          const answer = await initCheckout(id);

          expect(answer).to.include({ allowSoonAsPossible: false, allowOrderToTime: true });
          expect(answer.worktimeIntervals[0]).to.deep.equal([seconds(next(start)), seconds(next(stop))]);
          const days = (await limitSeconds()) / 86400;
          expect(answer.worktimeIntervals.length).to.be.within(days - 1, days + 1);
        });
      });

      it("only the kitchen of the zone takes the address: its hours, not the other kitchen's", async function () {
        const id = await newBasket();
        await add(id, await dishId("Dish 1"));
        await withSettings({ KITCHEN_RESOLVE_CHAIN: ["delivery-zone"] }, async () => {
          await withKitchens({ [kitchen2]: { worktime: LATER } }, async () => {
            await deliverTo(id, at(IN_ZONE_2));
            const answer = await initCheckout(id);

            expect(answer).to.include({ allowSoonAsPossible: false, allowOrderToTime: true });
            expect(answer.worktimeIntervals[0]).to.deep.equal([seconds(next(start)), seconds(next(stop))]);
          });
        });
      });

      it("pickup: the hours of its point", async function () {
        const id = await newBasket();
        await add(id, await dishId("Dish 1"));
        await withKitchens({ [kitchen1]: { worktime: LATER } }, async () => {
          await pickUpAt(id, kitchen1);
          const answer = await initCheckout(id);

          expect(answer).to.include({ allowSoonAsPossible: false, allowOrderToTime: true });
          expect(answer.worktimeIntervals[0]).to.deep.equal([seconds(next(start)), seconds(next(stop))]);
        });
      });

      it("no address and no point yet: never", async function () {
        const answer = await initCheckout(await newBasket());
        expect(answer).to.deep.include({ worktimeIntervals: [], allowSoonAsPossible: false, allowOrderToTime: false });
      });
    });
  });

  it("with soft calculation an order can be had all along: an operator finds a kitchen", async function () {
    const id = await newBasket();
    await add(id, await dishId("Dish 1"));
    const CLOSED_NOW = [{ dayOfWeek: CLOSED[0].dayOfWeek, start: "00:00", stop: "00:01" }];
    await withKitchens({ [kitchen1]: { worktime: CLOSED_NOW }, [kitchen2]: { worktime: CLOSED_NOW } }, async () => {
      await deliverTo(id, at(IN_ZONE_2));
      const answer = await OrderHelper.initCheckout(await Order.populate({ id }));

      expect(answer).to.include({ allowSoonAsPossible: true, allowOrderToTime: true });
      expect(answer.worktimeIntervals).to.have.length(1);
    });
  });
});
