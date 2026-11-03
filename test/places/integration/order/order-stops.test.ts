import { expect } from "chai";
import { resetDatabase } from "../../support/reset";
import { assignOrderKitchen } from "../../../../lib/order/assignKitchen";
import { backfillOrderStops, syncOrderStops } from "../../../../lib/order/order-stops";
import { NO_KITCHEN, countOrdersOfPlace, ordersOfPlace } from "../../../../lib/order/orders-of-place";
import { transitionOrder } from "../../../../lib/order/transitionOrder";

/**
 * The stops of an order (plan C2): one row per point that has work to do, written by one function
 * at every transition, and the only thing a point's board selects by.
 *
 * Two kitchens and a counter; a delivery, a pickup, a delivery routed over both kitchens and a
 * delivery no kitchen was resolved for.
 */
describe("Order stops", function () {
  const ADMIN = { id: "admin-1", isAdministrator: true };
  let kitchen1: string;
  let kitchen2: string;
  let counter: string;

  beforeEach(async function () {
    await resetDatabase();
    const city = (await City.create!({ name: "City 1" }).fetch()).id;
    kitchen1 = (await Place.create!({ title: "Kitchen 1", city, enable: true, isCookingPoint: true }).fetch()).id as string;
    kitchen2 = (await Place.create!({ title: "Kitchen 2", city, enable: true, isCookingPoint: true }).fetch()).id as string;
    counter = (await Place.create!({ title: "Counter", city, enable: true, isCookingPoint: false, isPickupPoint: true }).fetch()).id as string;
  });

  /** An order in `state`, written as the storefront leaves it, and its stops synced. */
  async function order(values: Record<string, unknown>, state = "ORDER"): Promise<string> {
    const created = await Order.create!({}).fetch();
    await Order.update!({ id: created.id }, {
      state,
      orderedAt: Math.floor(Date.now() / 1000),
      customer: { name: "Иван", phone: { code: "1", number: "5550000001", additionalNumber: "" } },
      ...values,
    }).fetch();
    await syncOrderStops({ id: created.id as string });
    return created.id as string;
  }

  const stopsOf = async (id: string) =>
    (await OrderStop.find!({ where: { order: id }, sort: "position ASC" }))
      .map((stop: any) => ({ place: stop.place ?? null, position: stop.position, orderState: stop.orderState }));

  it("gives a delivery its kitchen, pickup the chosen point, and a route one stop per kitchen", async function () {
    const delivery = await order({ serviceType: "delivery", cookingPoints: [kitchen1] });
    const pickup = await order({ serviceType: "pickup", pickupPoint: counter });
    const routed = await order({ serviceType: "delivery", cookingPoints: [kitchen1, kitchen2] });

    expect(await stopsOf(delivery)).to.deep.equal([{ place: kitchen1, position: 0, orderState: "ORDER" }]);
    expect(await stopsOf(pickup)).to.deep.equal([{ place: counter, position: 0, orderState: "ORDER" }]);
    expect(await stopsOf(routed)).to.deep.equal([
      { place: kitchen1, position: 0, orderState: "ORDER" },
      { place: kitchen2, position: 1, orderState: "ORDER" },
    ]);
  });

  it("gives a delivery with no kitchen one stop with no point — «Без кухни»", async function () {
    const waiting = await order({ serviceType: "delivery", cookingPoints: [] });

    expect(await stopsOf(waiting)).to.deep.equal([{ place: null, position: 0, orderState: "ORDER" }]);
    expect((await ordersOfPlace(NO_KITCHEN)).map((row) => row.id)).to.deep.equal([waiting]);
    expect(await ordersOfPlace([kitchen1, kitchen2, counter])).to.deep.equal([]);
  });

  it("gives a basket no stops at all, and takes them away if it becomes one", async function () {
    const basket = await order({ serviceType: "delivery", cookingPoints: [kitchen1] }, "CART");
    expect(await stopsOf(basket)).to.deep.equal([]);

    const placed = await order({ serviceType: "delivery", cookingPoints: [kitchen1] });
    expect(await stopsOf(placed)).to.have.length(1);
    await Order.update!({ id: placed }, { state: "CHECKOUT" }).fetch();
    await syncOrderStops({ id: placed });
    expect(await stopsOf(placed), "a basket again: nothing for a kitchen to do").to.deep.equal([]);
  });

  it("follows the order through the flow, state and times included", async function () {
    const id = await order({ serviceType: "delivery", cookingPoints: [kitchen1] });

    await transitionOrder({ id }, "COOKING", { user: ADMIN, source: "mobile-api" });
    expect((await stopsOf(id))[0].orderState).to.equal("COOKING");

    await transitionOrder({ id }, "DONE", { user: ADMIN, source: "mobile-api" });
    const [stop] = await OrderStop.find!({ where: { order: id } });
    expect(stop.orderState).to.equal("DONE");
    expect(stop.completedAt, "the copy a finished tab selects by").to.be.a("number");
  });

  it("moves the stop when a kitchen is assigned", async function () {
    const waiting = await order({ serviceType: "delivery", cookingPoints: [] });

    await assignOrderKitchen({ id: waiting }, kitchen2, { user: ADMIN, source: "order-kanban" });

    expect(await stopsOf(waiting)).to.deep.equal([{ place: kitchen2, position: 0, orderState: "ORDER" }]);
    expect(await ordersOfPlace(NO_KITCHEN)).to.deep.equal([]);
    expect((await ordersOfPlace(kitchen2)).map((row) => row.id)).to.deep.equal([waiting]);
  });

  it("answers for one point and counts both of its tabs", async function () {
    const mine = await order({ serviceType: "delivery", cookingPoints: [kitchen1] });
    const theirs = await order({ serviceType: "delivery", cookingPoints: [kitchen2] });
    const finished = await order({ serviceType: "delivery", cookingPoints: [kitchen1] });
    await transitionOrder({ id: finished }, "DONE", { user: ADMIN, source: "order-kanban" });

    expect((await ordersOfPlace(kitchen1)).map((row) => row.id)).to.deep.equal([mine]);
    expect((await ordersOfPlace(kitchen1, { tab: "done" })).map((row) => row.id)).to.deep.equal([finished]);
    expect(await countOrdersOfPlace(kitchen1)).to.deep.equal({ active: 1, done: 1 });
    expect((await ordersOfPlace([kitchen1, kitchen2])).map((row) => row.id)).to.have.members([mine, theirs]);
    expect(await ordersOfPlace([])).to.deep.equal([]);
  });

  it("shows an order routed over two kitchens once to whoever holds both", async function () {
    const routed = await order({ serviceType: "delivery", cookingPoints: [kitchen1, kitchen2] });

    expect((await ordersOfPlace([kitchen1, kitchen2])).map((row) => row.id)).to.deep.equal([routed]);
    expect(await countOrdersOfPlace([kitchen1, kitchen2])).to.deep.equal({ active: 1, done: 0 });
  });

  it("answers only what changed since a moment", async function () {
    const quiet = await order({ serviceType: "delivery", cookingPoints: [kitchen1] });
    const moved = await order({ serviceType: "delivery", cookingPoints: [kitchen1] });
    const since = Date.now() + 1;

    await transitionOrder({ id: moved }, "COOKING", { user: ADMIN, source: "mobile-api" });

    const changed = await ordersOfPlace(kitchen1, { since });
    expect(changed.map((row) => row.id)).to.deep.equal([moved]);
    expect(changed.map((row) => row.id)).to.not.contain(quiet);
  });

  it("fills the stops of an installation that had none, and only of the orders a board asks about", async function () {
    const active = await order({ serviceType: "delivery", cookingPoints: [kitchen1] });
    const old = await order({ serviceType: "delivery", cookingPoints: [kitchen1] });
    await Order.update!({ id: old }, { state: "DONE", completedAt: Math.floor(Date.now() / 1000) - 60 * 24 * 60 * 60 }).fetch();
    await OrderStop.destroy!({}).fetch();
    expect(await ordersOfPlace(kitchen1), "no stops, no orders").to.deep.equal([]);

    const written = await backfillOrderStops();

    expect(written).to.equal(1);
    expect((await ordersOfPlace(kitchen1)).map((row) => row.id)).to.deep.equal([active]);
    expect(await OrderStop.count!({ order: old }), "finished two months ago: off every board").to.equal(0);
    expect(await backfillOrderStops(), "a second boot writes nothing").to.equal(0);
  });
});
