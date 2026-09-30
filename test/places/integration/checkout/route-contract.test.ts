import { expect } from "chai";
import { DefaultMenuAdapter } from "../../../../adapters/menu/default/defaultMenu";
import { getProductAvailability } from "../../../../lib/menu/product-availability";
import { primaryCookingPoint } from "../../../../lib/menu/cooking-place";
import { resetDatabase, withSettings } from "../../support/reset";
import { add, checkout, deliverTo, lines, newBasket, pickUpAt, thrown, updateOrder, dropped } from "../../support/storefront";

/**
 * The route contract: core ships no router, but a menu adapter may split an
 * order across kitchens (`placeLines`) and charge for it (`adjustDelivery`).
 * Core writes what it answers — the order's kitchens, each line's stop, the
 * surcharge, the plan in the journal — refuses such an order when the RMS
 * cannot take it, and spends each line's stock at its own stop.
 *
 * The router here: a delivery cooked at Kitchen 2 fetches Dish 2 from Kitchen 1,
 * which is the only one selling it, and each extra kitchen costs 70.
 *
 *   City 1: Kitchen 1 in Zone 1 (delivery 100), Kitchen 2 in Zone 2 (delivery 150).
 */
describe("Checkout: route contract", function () {
  const ZONE_1 = [[9.9, 9.9], [10.05, 9.9], [10.05, 10.1], [9.9, 10.1], [9.9, 9.9]];
  const ZONE_2 = [[10.05, 9.9], [10.2, 9.9], [10.2, 10.1], [10.05, 10.1], [10.05, 9.9]];
  const IN_ZONE_2 = { city: "City 1", formatted: "Street 1", home: "1", coordinate: { lat: 10.0, lon: 10.09 } };

  let kitchen1: string;
  let kitchen2: string;
  let dish1: string;
  let dish2: string;

  class TwoStops extends DefaultMenuAdapter {
    protected async resolvePlaces(request: any) {
      const context = await super.resolvePlaces(request);
      if (request.order?.serviceType !== "delivery" || primaryCookingPoint(request.order) !== kitchen2) return context;
      return { ...context, placeIds: [kitchen2, kitchen1] };
    }

    public async placeLines(order: any, placed: any[], context: any, customer: any) {
      const base = await super.placeLines(order, placed, context, customer);
      if (order.serviceType !== "delivery" || primaryCookingPoint(order) !== kitchen2) return base;

      const line = placed.find((candidate) => candidate.dish.id === dish2);
      if (!line) return base;
      base.byOrderDish.set(line.orderDishId, { placeId: kitchen1, availability: await getProductAvailability(line.dish, kitchen1, line.amount) });
      return { placeIds: [kitchen2, kitchen1], byOrderDish: base.byOrderDish, plan: { stops: [], totalMinutes: 40, diagnostics: ["Route 1"] } };
    }

    public async adjustDelivery(order: any, delivery: any) {
      const extra = (order.cookingPoints ?? []).length - 1;
      return extra > 0 ? { ...delivery, cost: delivery.cost + 70 * extra } : delivery;
    }
  }

  before(async function () {
    await resetDatabase();
    const city = await City.create({ name: "City 1" }).fetch();
    const kitchen = async (title: string, coordinate: { lat: number; lon: number }) =>
      (await Place.create({ title, city: city.id, coordinate, enable: true, isCookingPoint: true, isPickupPoint: true, hasDiningArea: true }).fetch()).id;
    kitchen1 = await kitchen("Kitchen 1", { lat: 10.0, lon: 10.0 });
    kitchen2 = await kitchen("Kitchen 2", { lat: 10.0, lon: 10.1 });
    await DeliveryZone.create({ name: "Zone 1", polygon: ZONE_1, deliveryCost: 100, minDeliveryTime: 30 }).fetch();
    await DeliveryZone.create({ name: "Zone 2", polygon: ZONE_2, deliveryCost: 150, minDeliveryTime: 30 }).fetch();

    const group = await Group.create({ name: "Group 1", enable: true }).fetch();
    dish1 = (await Dish.create({ name: "Dish 1", price: 100, enable: true, parentGroup: group.id }).fetch()).id;
    dish2 = (await Dish.create({ name: "Dish 2", price: 100, enable: true, parentGroup: group.id }).fetch()).id;
    await DishPlace.create({ dish: dish2, place: kitchen2, localBalance: 0 }).fetch();

    Adapter.register("menu", "two-stops", new TwoStops());
  });

  /** Runs `run` under the router. No RMS strategy in the chain: the RMS here is a stand-in. */
  const routed = (run: () => Promise<void>) =>
    withSettings({ MENU_PLACE_BASED_MODE: "two-stops", KITCHEN_RESOLVE_CHAIN: ["delivery-zone", "nearest-geo"] }, run);

  /** Dish 1 and Dish 2, delivered into Zone 2: cooked at Kitchen 2, Dish 2 fetched from Kitchen 1. */
  async function routedBasket(): Promise<string> {
    const id = await newBasket();
    await add(id, dish1);
    await deliverTo(id, IN_ZONE_2);
    await add(id, dish2);
    return id;
  }

  /** Runs `run` with an RMS that can or cannot take a multi-kitchen order, and none after. */
  async function withRms(supportsMultiKitchen: boolean, run: () => Promise<void>) {
    (Adapter as any).instanceRMS = { supportsMultiKitchen };
    try {
      await run();
    } finally {
      (Adapter as any).instanceRMS = undefined;
    }
  }

  it("the recount writes the route: the kitchens, each line's stop, the surcharge, the journal", async function () {
    await routed(async () => {
      const id = await routedBasket();
      const order = await Order.findOne({ id });

      expect(order.cookingPoints).to.deep.equal([kitchen2, kitchen1]);
      const stops = Object.fromEntries((await OrderDish.find({ order: id })).map((line: any) => [line.dish, line.cookingPoint ?? null]));
      expect(stops).to.deep.equal({ [dish1]: null, [dish2]: kitchen1 });
      expect(order.delivery.cost).to.equal(150 + 70);
      expect((await Order.getLogs({ id })).map((entry) => entry.message)).to.include("countCart: route planned");
    });
  });

  it("checkout: taken without an RMS, refused by one that cannot split an order, taken by one that can", async function () {
    await routed(async () => {
      const id = await routedBasket();
      expect(await thrown(checkout(id))).to.equal(null);

      await updateOrder(id, {});
      await withRms(false, async () => {
        expect(await thrown(checkout(id))).to.deep.equal({ code: 22, error: "RMS_MULTIPLACE_UNSUPPORTED" });
      });
      await withRms(true, async () => {
        expect(await thrown(checkout(id))).to.equal(null);
      });
    });
  });

  it("switching to pickup collapses the route onto the chosen point", async function () {
    await routed(async () => {
      const id = await routedBasket();
      const order = await pickUpAt(id, kitchen2);

      expect(order.cookingPoints).to.deep.equal([kitchen2]);
      expect(await lines(id)).to.deep.equal({ "Dish 1": 1 });
      expect(order).to.deep.include(dropped("Dish 2"));
    });
  });

  it("placing a routed order spends each line's stock at its own stop", async function () {
    await DishPlace.create({ dish: dish2, place: kitchen1, localBalance: 3 }).fetch();
    await DishPlace.create({ dish: dish1, place: kitchen2, localBalance: 4 }).fetch();

    await routed(async () => {
      const id = await routedBasket();
      await checkout(id);
      await Order.order({ id });
    });

    const stock = async (dish: string, place: string) => (await DishPlace.findOne({ dish, place })).localBalance;
    expect(await stock(dish2, kitchen1)).to.equal(2);
    expect(await stock(dish1, kitchen2)).to.equal(3);
  });
});
