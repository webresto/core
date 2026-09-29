import { expect } from "chai";
import { Adapter } from "../../adapters";
import { DefaultMenuAdapter } from "../../adapters/menu/default/defaultMenu";
import { KITCHEN_LOG } from "../../lib/order/kitchen-assignment";
import { getProductAvailability } from "../../lib/menu/product-availability";
import { primaryCookingPoint } from "../../lib/menu/cooking-place";
import { COORD, MultiKitchenWorld, thrown } from "./support/multi-kitchen-world";

/**
 * A basket through the life core gives it: adding, the kitchen its address or
 * point picks, what a change of kitchen, city, service type or stock does to
 * it, and whether checkout takes it. Everything below runs core's own models
 * and menu adapter over the world in `support/multi-kitchen-world`.
 */
describe("basket-flow", function () {
  let world: MultiKitchenWorld;

  beforeEach(function () {
    world = MultiKitchenWorld.install();
  });

  afterEach(function () {
    world.restore();
  });

  const DROPPED = (products: string) => `Some products are not available here and were removed: ${products}`;

  describe("before a kitchen: what every kitchen in reach has", function () {
    it("with no city, takes only what each kitchen of every city can sell", async function () {
      const id = world.newOrder();

      await world.add(id, "A");
      await world.add(id, "D", 2);
      expect(world.lines(id)).to.deep.equal({ A: 1, D: 2 });

      // C is stopped in City2, B everywhere but K11.
      expect(await thrown(world.add(id, "C"))).to.be.an("error");
      expect(await thrown(world.add(id, "B"))).to.be.an("error");
      // D: 2 at K11 is the ceiling, and the two already in the basket count.
      expect((await thrown(world.add(id, "D"))).message).to.contain("Available quantity: 2");

      expect(world.order(id).cookingPoints).to.deep.equal([]);
    });

    it("with a city, takes what each kitchen of that city can sell", async function () {
      const id = world.newOrder();
      await world.selectCity(id, "City One");

      await world.add(id, "C");
      expect(world.lines(id)).to.deep.equal({ C: 1 });
      expect(await thrown(world.add(id, "B"))).to.be.an("error");
      expect(world.order(id).cookingPoints).to.deep.equal([]);
    });

    it("switching city without an address drops what the new city lacks, and says so", async function () {
      const id = world.newOrder();
      await world.selectCity(id, "City One");
      await world.add(id, "A");
      await world.add(id, "C");

      const order = await world.selectCity(id, "City Two");

      expect(world.lines(id)).to.deep.equal({ A: 1 });
      expect(order.message).to.equal(DROPPED("C"));
      expect(world.messages(id, KITCHEN_LOG.dropped)).to.have.length(1);
      // No kitchen before or after: not a change of kitchen.
      expect(world.events.some((event) => event.name === "core:order-cooking-place-changed")).to.equal(false);
    });
  });

  describe("delivery: the kitchen the address picks", function () {
    it("an address in a zone assigns its kitchen, opens its menu and checks out", async function () {
      const id = world.newOrder();
      await world.deliverTo(id, COORD.inZ11);

      expect(world.order(id).cookingPoints).to.deep.equal(["K11"]);
      expect(world.messages(id, KITCHEN_LOG.assigned)[0].data).to.include({ to: "K11", strategy: "delivery-zone" });

      await world.add(id, "B");
      await world.add(id, "D", 2);
      expect(await thrown(world.add(id, "D"))).to.be.an("error");

      expect(await thrown(world.check(id))).to.equal(null);
      const order = world.order(id);
      expect(order.state).to.equal("CHECKOUT");
      expect(order.delivery).to.include({ allowed: true, cost: 100, zoneId: "Z11" });
      expect(order.basketTotal).to.equal(300);
      expect(order.total).to.equal(400);
    });

    it("moving to another zone moves the kitchen and drops what it lacks", async function () {
      const id = world.newOrder();
      await world.deliverTo(id, COORD.inZ11);
      await world.add(id, "B");
      await world.add(id, "D", 2);

      const order = await world.deliverTo(id, COORD.inZ12);

      expect(order.cookingPoints).to.deep.equal(["K12"]);
      expect(world.lines(id)).to.deep.equal({ D: 2 });
      expect(order.message).to.equal(DROPPED("B"));
      expect(world.messages(id, KITCHEN_LOG.assigned).map((entry) => entry.data.to)).to.deep.equal(["K11", "K12"]);
      const moved = world.events.filter((event) => event.name === "core:order-cooking-place-changed");
      expect(moved.map((event) => event.args[1])).to.deep.equal([["B"]]);
      expect(order.delivery).to.include({ cost: 150, zoneId: "Z12" });
    });

    it("an address outside every zone goes to the nearest open kitchen", async function () {
      const id = world.newOrder();
      await world.deliverTo(id, COORD.outside);

      expect(world.order(id).cookingPoints).to.deep.equal(["K12"]);
      expect(world.messages(id, KITCHEN_LOG.assigned)[0].data.strategy).to.equal("nearest-geo");
    });

    it("an address in another city is served there", async function () {
      const id = world.newOrder();
      await world.deliverTo(id, COORD.inCity2, "City Two");
      expect(world.order(id).cookingPoints).to.deep.equal(["K21"]);
    });

    it("a kitchen switched off after it was assigned hands the basket to the next one", async function () {
      const id = world.newOrder();
      await world.deliverTo(id, COORD.inZ11);
      await world.add(id, "A");
      await world.add(id, "B");

      world.setPlace("K11", { enable: false });
      const order = await world.update(id, {});

      expect(order.cookingPoints).to.deep.equal(["K12"]);
      expect(world.lines(id)).to.deep.equal({ A: 1 });
      expect(order.message).to.equal(DROPPED("B"));
    });
  });

  describe("no kitchen at checkout", function () {
    async function basketWithoutKitchen(): Promise<string> {
      const id = world.newOrder();
      await world.selectCity(id, "City One");
      await world.add(id, "A");
      // Street and house, no coordinate: nothing to choose a kitchen by.
      await world.deliverTo(id, null);
      expect(world.order(id).cookingPoints).to.deep.equal([]);
      return id;
    }

    it("an address without a coordinate is refused", async function () {
      const id = await basketWithoutKitchen();
      expect(await thrown(world.check(id))).to.deep.equal({ code: 26, error: "NO_KITCHEN" });
      expect(world.order(id).state).to.equal("CART");
    });

    it("soft delivery calculation takes it anyway, for an operator to settle", async function () {
      world.settings.set("SOFT_DELIVERY_CALCULATION", true);
      const id = await basketWithoutKitchen();

      expect(await thrown(world.check(id))).to.equal(null);
      expect(world.order(id).state).to.equal("CHECKOUT");
      expect(world.order(id).delivery).to.include({ allowed: true, cost: null });
    });

    it("the basket without a kitchen still holds only what each kitchen of its city has", async function () {
      const id = await basketWithoutKitchen();
      expect(await thrown(world.add(id, "B"))).to.be.an("error");
      await world.add(id, "C");
      expect(world.lines(id)).to.deep.equal({ A: 1, C: 1 });
    });

    it("every kitchen closed: nobody can take it", async function () {
      const closed = [{ dayOfWeek: "all", start: "00:00", stop: "00:01" }];
      for (const id of ["K11", "K12", "K21"]) world.setPlace(id, { worktime: closed });

      const id = world.newOrder();
      await world.add(id, "A");
      await world.deliverTo(id, COORD.inZ11);

      expect(world.order(id).cookingPoints).to.deep.equal([]);
      expect(await thrown(world.check(id))).to.deep.equal({ code: 26, error: "NO_KITCHEN" });
    });

    it("beyond the radius cap, with no zone: nobody can take it", async function () {
      world.settings.set("DELIVERY_MAX_RADIUS_KM", 1);
      const id = world.newOrder();
      await world.add(id, "A");
      await world.deliverTo(id, COORD.outside);

      expect(world.order(id).cookingPoints).to.deep.equal([]);
      expect(await thrown(world.check(id))).to.deep.equal({ code: 26, error: "NO_KITCHEN" });
    });

    it("an empty chain names no kitchen for a delivery", async function () {
      world.settings.set("KITCHEN_RESOLVE_CHAIN", []);
      const id = world.newOrder();
      await world.add(id, "A");
      await world.deliverTo(id, COORD.inZ11);

      expect(world.order(id).cookingPoints).to.deep.equal([]);
      expect(await thrown(world.check(id))).to.deep.equal({ code: 26, error: "NO_KITCHEN" });
    });

    it("the default chain alone gives a one-kitchen installation its kitchen, address or not", async function () {
      world.setPlace("K12", { isCookingPoint: false });
      world.setPlace("K21", { isCookingPoint: false });
      const id = world.newOrder();
      await world.add(id, "A");
      await world.deliverTo(id, null);

      expect(world.order(id).cookingPoints).to.deep.equal(["K11"]);
      expect(world.messages(id, KITCHEN_LOG.assigned)[0].data.strategy).to.equal("single-point");
    });

    it("a delivery outside every zone with soft calculation off is refused for the delivery", async function () {
      const id = world.newOrder();
      await world.add(id, "A");
      await world.deliverTo(id, COORD.outside);

      expect(world.order(id).cookingPoints).to.deep.equal(["K12"]);
      expect(await thrown(world.check(id))).to.deep.equal({ code: 11, error: "Delivery not allowed" });
    });
  });

  describe("switching the service type", function () {
    async function basketAtK11(): Promise<string> {
      const id = world.newOrder();
      await world.deliverTo(id, COORD.inZ11);
      await world.add(id, "A");
      await world.add(id, "B");
      await world.add(id, "C");
      return id;
    }

    it("pickup at another kitchen drops what it lacks; delivery is gone", async function () {
      const id = await basketAtK11();
      const order = await world.pickUp(id, "K12");

      expect(order.cookingPoints).to.deep.equal(["K12"]);
      expect(world.lines(id)).to.deep.equal({ A: 1, C: 1 });
      expect(order.message).to.equal(DROPPED("B"));
      expect(order.delivery).to.equal(null);
      expect(await thrown(world.check(id))).to.equal(null);
    });

    it("pickup and dine-in at the same kitchen keep everything", async function () {
      const id = await basketAtK11();

      await world.pickUp(id, "K11");
      expect(world.lines(id)).to.deep.equal({ A: 1, B: 1, C: 1 });
      await world.pickUp(id, "K11", "dine-in");
      expect(world.order(id).cookingPoints).to.deep.equal(["K11"]);
      expect(world.lines(id)).to.deep.equal({ A: 1, B: 1, C: 1 });
      expect(await thrown(world.check(id))).to.equal(null);
    });

    it("back to delivery: the kitchen follows the address, and what was dropped stays dropped", async function () {
      const id = await basketAtK11();
      await world.pickUp(id, "K12");
      const order = await world.deliverTo(id, COORD.inZ11);

      expect(order.cookingPoints).to.deep.equal(["K11"]);
      expect(world.lines(id)).to.deep.equal({ A: 1, C: 1 });
    });

    it("switching between two pickup points moves the kitchen with the customer", async function () {
      const id = world.newOrder();
      await world.pickUp(id, "K11");
      await world.add(id, "B");
      const order = await world.pickUp(id, "K12");

      expect(order.cookingPoints).to.deep.equal(["K12"]);
      expect(world.lines(id)).to.deep.equal({});
      expect(order.message).to.equal(DROPPED("B"));
    });

    it("a pickup point that does not cook has no kitchen and is refused at checkout", async function () {
      const id = await basketAtK11();
      const order = await world.pickUp(id, "P1");

      expect(order.cookingPoints).to.deep.equal([]);
      // No kitchen: the basket is read at every kitchen of its city.
      expect(world.lines(id)).to.deep.equal({ A: 1, C: 1 });
      const error = await thrown(world.check(id));
      expect(error.code).to.equal(24);
      expect(error.error).to.contain("PLACE_NOT_SERVING");
    });

    it("a closed pickup point is refused as closed", async function () {
      const id = world.newOrder();
      await world.pickUp(id, "K11");
      await world.add(id, "A");
      world.setPlace("K11", { worktime: [{ dayOfWeek: "all", start: "00:00", stop: "00:01" }] });

      expect(await thrown(world.check(id))).to.deep.equal({ code: 23, error: "PLACE_CLOSED" });
    });
  });

  describe("stock", function () {
    it("less left than the line holds: the line is cut to what is left, quietly", async function () {
      const id = world.newOrder();
      await world.deliverTo(id, COORD.inZ11);
      await world.add(id, "D", 2);

      world.setStock("D", "K11", 1);
      const order = await world.update(id, {});

      expect(world.lines(id)).to.deep.equal({ D: 1 });
      expect(order.message).to.equal("");
      expect(order.dishesCount).to.equal(1);
      expect(order.basketTotal).to.equal(100);
    });

    it("nothing left: the line goes, the customer is told, and an empty basket cannot be checked out", async function () {
      const id = world.newOrder();
      await world.deliverTo(id, COORD.inZ11);
      await world.add(id, "D", 2);

      world.setStock("D", "K11", 0);
      const order = await world.update(id, {});

      expect(world.lines(id)).to.deep.equal({});
      expect(order.message).to.equal(DROPPED("D"));
      // Sold out where it was: the kitchen did not change.
      expect(world.events.some((event) => event.name === "core:order-cooking-place-changed")).to.equal(false);
      expect(order.dishesCount).to.equal(0);
      expect((await thrown(world.check(id))).code).to.equal(13);
    });

    it("setCount asks the same question as addDish, counting the whole basket", async function () {
      const id = world.newOrder();
      await world.deliverTo(id, COORD.inZ11);
      await world.add(id, "D");

      expect((await thrown(world.setCount(id, "D", 3))).code).to.equal(1);
      await world.setCount(id, "D", 2);
      expect(world.lines(id)).to.deep.equal({ D: 2 });
    });

    it("a change of stock just before checkout is applied by checkout's own recount", async function () {
      const id = world.newOrder();
      await world.deliverTo(id, COORD.inZ11);
      await world.add(id, "D", 2);

      world.setStock("D", "K11", 1);
      expect(await thrown(world.check(id))).to.equal(null);
      expect(world.lines(id)).to.deep.equal({ D: 1 });
    });

    it("placing the order spends the kitchen's stock, RMS or not", async function () {
      const id = world.newOrder();
      await world.deliverTo(id, COORD.inZ11);
      await world.add(id, "D", 2);
      await world.add(id, "A");
      await world.check(id);

      await Order.order({ id });

      expect(world.order(id).state).to.equal("ORDER");
      expect(world.stock("D", "K11")).to.equal(0);
      expect(world.stock("D", "K12")).to.equal(5);
      // An unlimited product gets no row.
      expect(world.stock("A", "K11")).to.equal(null);
    });
  });

  describe("maximum wait", function () {
    it("refuses a product that alone cooks longer, and a promise longer than the wait", async function () {
      const id = world.newOrder({ maxWaitMinutes: 30 });
      await world.deliverTo(id, COORD.inZ11);

      expect((await thrown(world.add(id, "S"))).code).to.equal(25);
      await world.add(id, "A");
      // 20 minutes of cooking and a 30-minute delivery floor.
      expect((await thrown(world.check(id))).code).to.equal(21);
    });
  });

  describe("no kitchen anywhere", function () {
    beforeEach(function () {
      for (const id of ["K11", "K12", "K21"]) world.setPlace(id, { isCookingPoint: false });
    });

    it("default mode: stock is unknown and everything goes in", async function () {
      const id = world.newOrder();
      await world.add(id, "B");
      expect(world.lines(id)).to.deep.equal({ B: 1 });
    });

    it("single-place mode: nothing goes in", async function () {
      world.settings.set("MENU_PLACE_BASED_MODE", "single-place");
      const id = world.newOrder();
      expect((await thrown(world.add(id, "A"))).message).to.contain("MENU_PLACE_REQUIRED");
    });
  });

  describe("single-place mode", function () {
    beforeEach(function () {
      world.settings.set("MENU_PLACE_BASED_MODE", "single-place");
    });

    it("reads a basket without a kitchen the way the default mode does", async function () {
      const id = world.newOrder();
      await world.selectCity(id, "City One");
      await world.add(id, "C");
      expect(await thrown(world.add(id, "B"))).to.be.an("error");
    });

    it("and the kitchen's menu once there is one", async function () {
      const id = world.newOrder();
      await world.deliverTo(id, COORD.inZ11);
      await world.add(id, "B");
      expect(world.lines(id)).to.deep.equal({ B: 1 });
    });
  });

  describe("the route contract", function () {
    /**
     * A stand-in for a routing module: a delivery cooked at K12 fetches B from
     * K11, and every extra kitchen costs 70.
     */
    class TwoStops extends DefaultMenuAdapter {
      protected async resolvePlaces(request: any) {
        const context = await super.resolvePlaces(request);
        const kitchen = primaryCookingPoint(request.order);
        if (request.order?.serviceType !== "delivery" || kitchen !== "K12") return context;
        return { ...context, placeIds: ["K12", "K11"] };
      }

      public async placeLines(order: any, lines: any[], context: any, customer: any) {
        const base = await super.placeLines(order, lines, context, customer);
        if (order.serviceType !== "delivery" || primaryCookingPoint(order) !== "K12") return base;

        const b = lines.find((line) => line.dish.id === "B");
        if (!b) return base;
        base.byOrderDish.set(b.orderDishId, { placeId: "K11", availability: await getProductAvailability(b.dish, "K11", b.amount) });
        return {
          placeIds: ["K12", "K11"],
          byOrderDish: base.byOrderDish,
          plan: { stops: [], totalMinutes: 40, diagnostics: ["test route"] },
        };
      }

      public async adjustDelivery(order: any, delivery: any) {
        const extra = (order.cookingPoints ?? []).length - 1;
        return extra > 0 ? { ...delivery, cost: delivery.cost + 70 * extra } : delivery;
      }
    }

    beforeEach(function () {
      Adapter.register("menu", "two-stops", new TwoStops());
      world.settings.set("MENU_PLACE_BASED_MODE", "two-stops");
    });

    async function routedBasket(): Promise<string> {
      const id = world.newOrder();
      await world.deliverTo(id, COORD.inZ12);
      await world.add(id, "A");
      await world.add(id, "B");
      return id;
    }

    it("countCart writes the route: the order's kitchens, each line's stop, the surcharge, the journal", async function () {
      const id = await routedBasket();
      const order = world.order(id);

      expect(order.cookingPoints).to.deep.equal(["K12", "K11"]);
      expect(world.lineKitchens(id)).to.deep.equal({ A: null, B: "K11" });
      expect(order.delivery.cost).to.equal(150 + 70);
      expect(world.messages(id, "countCart: route planned")).to.not.be.empty;
    });

    it("checkout: no RMS takes it, an RMS that cannot split refuses it, one that can takes it", async function () {
      const id = await routedBasket();
      expect(await thrown(world.check(id))).to.equal(null);

      await world.update(id, {});
      await Order.next(id, "CART");
      world.rms = { supportsMultiKitchen: false };
      expect(await thrown(world.check(id))).to.deep.equal({ code: 22, error: "RMS_MULTIPLACE_UNSUPPORTED" });

      world.rms = { supportsMultiKitchen: true };
      expect(await thrown(world.check(id))).to.equal(null);
    });

    it("switching to pickup collapses the route onto the chosen point", async function () {
      const id = await routedBasket();
      const order = await world.pickUp(id, "K12");

      expect(order.cookingPoints).to.deep.equal(["K12"]);
      expect(world.lines(id)).to.deep.equal({ A: 1 });
      expect(order.message).to.equal(DROPPED("B"));
    });

    it("placing a routed order spends each line's stock at its own stop", async function () {
      world.setStock("B", "K11", 3);
      world.setStock("A", "K12", 4);
      const id = await routedBasket();
      await world.check(id);

      await Order.order({ id });

      expect(world.stock("B", "K11")).to.equal(2);
      expect(world.stock("A", "K12")).to.equal(3);
    });
  });
});
