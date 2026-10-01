import { expect } from "chai";
import { resetDatabase } from "../../support/reset";
import { add, checkout, deliverTo, lines, newBasket, thrown, updateOrder } from "../../support/storefront";

/**
 * Stock at the basket's kitchen: a line is cut quietly to what is left, a
 * product with nothing left goes and the customer is told, `setCount` counts
 * the whole basket against the stock, checkout's own recount applies a change
 * made just before it, and placing the order spends the kitchen's stock.
 *
 *   City 1: Kitchen 1 in Zone 1, Kitchen 2. Dish 1 is unlimited;
 *   Dish 2 has 2 at Kitchen 1 and 5 at Kitchen 2.
 */
describe("Stock", function () {
  const IN_ZONE_1 = { city: "City 1", formatted: "Street 1", home: "1", coordinate: { lat: 10.0, lon: 10.01 } };
  let kitchen1: string;
  let kitchen2: string;
  let dish1: string;
  let dish2: string;
  const moved: unknown[][] = [];

  before(async function () {
    await resetDatabase();
    const city = (await City.create({ name: "City 1" }).fetch()).id;
    kitchen1 = (await Place.create({ title: "Kitchen 1", city, coordinate: { lat: 10.0, lon: 10.0 }, enable: true, isCookingPoint: true, isPickupPoint: true }).fetch()).id;
    kitchen2 = (await Place.create({ title: "Kitchen 2", city, coordinate: { lat: 10.0, lon: 10.1 }, enable: true, isCookingPoint: true, isPickupPoint: true }).fetch()).id;
    await DeliveryZone.create({ name: "Zone 1", polygon: [[9.9, 9.9], [10.05, 9.9], [10.05, 10.1], [9.9, 10.1], [9.9, 9.9]], deliveryCost: 100, minDeliveryTime: 30 }).fetch();
    const group = await Group.create({ name: "Group 1", enable: true }).fetch();
    dish1 = (await Dish.create({ name: "Dish 1", price: 100, enable: true, parentGroup: group.id }).fetch()).id;
    dish2 = (await Dish.create({ name: "Dish 2", price: 100, enable: true, parentGroup: group.id }).fetch()).id;

    // `emitter.off` does not unsubscribe: one subscriber for the file.
    emitter.on("core:order-cooking-place-changed", "stock-test", (...args: unknown[]) => {
      moved.push(args);
    });
  });

  beforeEach(async function () {
    moved.length = 0;
    await DishPlace.destroy({}).fetch();
    await setStock(kitchen1, 2);
    await setStock(kitchen2, 5);
  });

  async function setStock(place: string, localBalance: number): Promise<void> {
    const row = await DishPlace.findOne({ dish: dish2, place });
    if (row) await DishPlace.update({ id: row.id }, { localBalance }).fetch();
    else await DishPlace.create({ dish: dish2, place, localBalance }).fetch();
  }
  const stockOf = async (dish: string, place: string) => (await DishPlace.findOne({ dish, place }))?.localBalance ?? null;

  /** Two of Dish 2, delivered into Zone 1: at Kitchen 1, which has two. */
  async function twoAtKitchen1(): Promise<string> {
    const id = await newBasket();
    await add(id, dish1);
    await deliverTo(id, IN_ZONE_1);
    await add(id, dish2, 2);
    return id;
  }

  it("less left than the line holds: the line is cut to what is left, quietly", async function () {
    const id = await twoAtKitchen1();
    await setStock(kitchen1, 1);

    const order = await updateOrder(id, {});

    expect(await lines(id)).to.deep.equal({ "Dish 1": 1, "Dish 2": 1 });
    expect(order.message).to.equal("");
    expect(order.basketTotal).to.equal(200);
  });

  it("nothing left: the line goes and the customer is told; the kitchen stays", async function () {
    const id = await twoAtKitchen1();
    await setStock(kitchen1, 0);

    const order = await updateOrder(id, {});

    expect(await lines(id)).to.deep.equal({ "Dish 1": 1 });
    expect(order.message).to.equal("Some products are not available here and were removed: Dish 2");
    expect(order.cookingPoints).to.deep.equal([kitchen1]);
    expect(moved).to.deep.equal([]);
  });

  it("a basket emptied that way cannot be checked out", async function () {
    const id = await newBasket();
    await add(id, dish2);
    await deliverTo(id, IN_ZONE_1);
    await setStock(kitchen1, 0);
    await updateOrder(id, {});

    expect((await thrown(checkout(id))).code).to.equal(13);
  });

  it("setCount asks the stock what addDish asks, counting the whole basket", async function () {
    const id = await newBasket();
    await add(id, dish1);
    await deliverTo(id, IN_ZONE_1);
    await add(id, dish2);
    const line = { ...(await OrderDish.findOne({ order: id, dish: dish2 })), dish: await Dish.findOne({ id: dish2 }) };

    expect((await thrown(Order.setCount({ id }, line, 3))).code).to.equal(1);
    await Order.setCount({ id }, line, 2);
    expect(await lines(id)).to.deep.equal({ "Dish 1": 1, "Dish 2": 2 });
  });

  it("a change of stock just before checkout is applied by checkout's own recount", async function () {
    const id = await twoAtKitchen1();
    await setStock(kitchen1, 1);

    expect(await thrown(checkout(id))).to.equal(null);
    expect(await lines(id)).to.deep.equal({ "Dish 1": 1, "Dish 2": 1 });
  });

  it("placing the order spends the kitchen's stock, with no RMS; an unlimited product gets no row", async function () {
    const id = await twoAtKitchen1();
    await checkout(id);

    await Order.order({ id });

    expect((await Order.findOne({ id })).state).to.equal("ORDER");
    expect(await stockOf(dish2, kitchen1)).to.equal(0);
    expect(await stockOf(dish2, kitchen2)).to.equal(5);
    expect(await stockOf(dish1, kitchen1)).to.equal(null);
  });
});
