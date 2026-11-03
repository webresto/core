import { expect } from "chai";
import GetOrderKanbanOrdersController from "../../../../lib/adminpanel/src/controller/get-order-kanban-orders";
import GetOrderKanbanOrderController from "../../../../lib/adminpanel/src/controller/get-order-kanban-order";
import GetOrderKanbanPlacesController from "../../../../lib/adminpanel/src/controller/get-order-kanban-places";
import UpdateOrderKanbanStateController from "../../../../lib/adminpanel/src/controller/update-order-kanban-state";
import AssignOrderKanbanKitchenController from "../../../../lib/adminpanel/src/controller/assign-order-kanban-kitchen";
import { AccessRightsHelper } from "../../../../../../node_modules/adminizer/helpers/accessRightsHelper.js";
import { checkOrderKanbanToken, NO_KITCHEN } from "../../../../lib/adminpanel/order-kanban-rights";
import { countOrdersOfPlace, ordersOfPlace } from "../../../../lib/order/orders-of-place";
import { transitionOrder } from "../../../../lib/order/transitionOrder";
import { assignOrderKitchen } from "../../../../lib/order/assignKitchen";
import { resetDatabase } from "../../support/reset";

/**
 * The orders board by points (plan C1, C5, C6): an operator of one point sees its orders and nothing
 * of another's — not in the list, not by direct id, not when moving one — the move itself is core's
 * one function, and an order that arrived without a kitchen can be given one.
 *
 * Two kitchens, a pickup counter, and four orders: one at each kitchen, one collected at the
 * counter, one delivery with no kitchen resolved.
 */
describe("Order kanban by points", function () {
  let kitchen1: string;
  let kitchen2: string;
  let counter: string;
  let atKitchen1: string;
  let atKitchen2: string;
  let atCounter: string;
  let noKitchen: string;

  /** The helper the panel hands the controllers, with `order-kanban` as the manifest ships it. */
  function accessRights() {
    const helper = new AccessRightsHelper({ config: { auth: { enable: true } } } as any);
    helper.registerToken({
      id: "order-kanban",
      name: "Current Orders",
      description: "Orders",
      department: "Orders",
      check: checkOrderKanbanToken,
    });
    return helper;
  }

  const ADMIN = { id: "admin-1", isAdministrator: true };
  const operatorOf = (...rights: string[]) => ({
    id: `operator-${rights.join("-")}`,
    isAdministrator: false,
    groups: [{ name: "Operator", tokens: [{ tokenId: "order-kanban", rights }] }],
  });

  function request(user: object, query: Record<string, unknown> = {}, body: Record<string, unknown> = {}) {
    return { user, query, body, adminizer: { config: { auth: { enable: true } }, accessRightsHelper: accessRights() } };
  }

  /** Calls a controller the way the panel does; resolves to the status and the body. */
  function call(controller: any, req: any): Promise<{ status: number; body: any }> {
    return new Promise((resolve) => {
      let status = 200;
      const res = {
        set() { return res; },
        status(code: number) { status = code; return res; },
        json(body: any) { resolve({ status, body }); return res; },
        sendStatus(code: number) { resolve({ status: code, body: null }); return res; },
        redirect() { resolve({ status: 302, body: null }); return res; },
      };
      void controller(req, res);
    });
  }

  async function placed(values: Record<string, unknown>): Promise<string> {
    const order = await Order.create!({}).fetch();
    await Order.update!({ id: order.id }, { ...values, state: "ORDER", orderedAt: Math.floor(Date.now() / 1000) }).fetch();
    return order.id as string;
  }

  beforeEach(async function () {
    await resetDatabase();
    const city = (await City.create!({ name: "City 1" }).fetch()).id;
    kitchen1 = (await Place.create!({ title: "Kitchen 1", city, enable: true, isCookingPoint: true, isPickupPoint: false }).fetch()).id as string;
    kitchen2 = (await Place.create!({ title: "Kitchen 2", city, enable: true, isCookingPoint: true, isPickupPoint: false }).fetch()).id as string;
    counter = (await Place.create!({ title: "Counter", city, enable: true, isCookingPoint: false, isPickupPoint: true }).fetch()).id as string;

    atKitchen1 = await placed({ serviceType: "delivery", cookingPoints: [kitchen1], customer: { name: "Customer 1", phone: { code: "1", number: "5550000001", additionalNumber: "" } } });
    atKitchen2 = await placed({ serviceType: "delivery", cookingPoints: [kitchen2], customer: { name: "Customer 2", phone: { code: "1", number: "5550000002", additionalNumber: "" } } });
    atCounter = await placed({ serviceType: "pickup", pickupPoint: counter, customer: { name: "Customer 3", phone: { code: "1", number: "5550000003", additionalNumber: "" } } });
    noKitchen = await placed({ serviceType: "delivery", cookingPoints: [], customer: { name: "Customer 4", phone: { code: "1", number: "5550000004", additionalNumber: "" } } });
  });

  it("selects the orders of one point, and «Без кухни» separately", async function () {
    expect((await ordersOfPlace(kitchen1)).map((order) => order.id)).to.deep.equal([atKitchen1]);
    expect((await ordersOfPlace(counter)).map((order) => order.id)).to.deep.equal([atCounter]);
    expect((await ordersOfPlace(NO_KITCHEN)).map((order) => order.id)).to.deep.equal([noKitchen]);
    expect((await ordersOfPlace([kitchen1, kitchen2])).map((order) => order.id)).to.have.members([atKitchen1, atKitchen2]);
    expect(await ordersOfPlace([])).to.deep.equal([]);
  });

  it("never lists a basket", async function () {
    const basket = await Order.create!({}).fetch();
    await Order.update!({ id: basket.id }, { state: "CART", serviceType: "delivery", cookingPoints: [kitchen1] }).fetch();

    expect((await ordersOfPlace(kitchen1)).map((order) => order.id)).to.deep.equal([atKitchen1]);
    expect(await countOrdersOfPlace(kitchen1)).to.deep.equal({ active: 1, done: 0 });
  });

  it("counts the tabs of the point, and moves an order from one to the other", async function () {
    expect(await countOrdersOfPlace(kitchen1)).to.deep.equal({ active: 1, done: 0 });

    const moved = await transitionOrder({ id: atKitchen1 }, "DONE", { user: ADMIN, source: "mobile-api" });

    expect(moved.ok && moved.order.state).to.equal("DONE");
    expect(await countOrdersOfPlace(kitchen1)).to.deep.equal({ active: 0, done: 1 });
    expect((await ordersOfPlace(kitchen1, { tab: "done" })).map((order) => order.id)).to.deep.equal([atKitchen1]);
  });

  it("answers only what changed since a moment", async function () {
    const before = Date.now() + 1;
    expect(await ordersOfPlace([kitchen1, kitchen2], { since: before })).to.deep.equal([]);

    await transitionOrder({ id: atKitchen2 }, "COOKING", { user: ADMIN, source: "mobile-api" });

    expect((await ordersOfPlace([kitchen1, kitchen2], { since: before })).map((order) => order.id)).to.deep.equal([atKitchen2]);
  });

  it("shows an operator the orders of their points only", async function () {
    const { status, body } = await call(GetOrderKanbanOrdersController, request(operatorOf(kitchen1), { includeDone: "1" }));

    expect(status).to.equal(200);
    expect(body.results.map((order: any) => order.id)).to.deep.equal([atKitchen1]);
    expect(body.results[0].placeId).to.equal(kitchen1);
  });

  it("gives an administrator every point, and the point asked for when asked", async function () {
    const all = await call(GetOrderKanbanOrdersController, request(ADMIN, { includeDone: "1" }));
    expect(all.body.results.map((order: any) => order.id)).to.have.members([atKitchen1, atKitchen2, atCounter, noKitchen]);

    const one = await call(GetOrderKanbanOrdersController, request(ADMIN, { placeId: kitchen2 }));
    expect(one.body.results.map((order: any) => order.id)).to.deep.equal([atKitchen2]);
  });

  it("refuses a point the operator does not hold", async function () {
    const { status } = await call(GetOrderKanbanOrdersController, request(operatorOf(kitchen1), { placeId: kitchen2 }));

    expect(status).to.equal(403);
  });

  it("does not find an order of another point by its id", async function () {
    const mine = await call(GetOrderKanbanOrderController, request(operatorOf(kitchen1), { id: atKitchen1 }));
    expect(mine.status).to.equal(200);
    expect(mine.body.order.placeId).to.equal(kitchen1);

    const theirs = await call(GetOrderKanbanOrderController, request(operatorOf(kitchen1), { id: atKitchen2 }));
    expect(theirs.status).to.equal(404);
  });

  it("does not move an order of another point", async function () {
    const theirs = await call(UpdateOrderKanbanStateController, request(operatorOf(kitchen1), {}, { id: atKitchen2, nextState: "COOKING" }));

    expect(theirs.status).to.equal(404);
    expect((await Order.findOne!({ id: atKitchen2 })).state).to.equal("ORDER");

    const mine = await call(UpdateOrderKanbanStateController, request(operatorOf(kitchen1), {}, { id: atKitchen1, nextState: "COOKING" }));

    expect(mine.status).to.equal(200);
    expect(mine.body.order.state).to.equal("COOKING");
    expect(mine.body.order.placeId).to.equal(kitchen1);
  });

  it("offers the points of the switch, «Без кухни» among them", async function () {
    const admin = await call(GetOrderKanbanPlacesController, request(ADMIN));
    expect(admin.body.results.map((place: any) => place.id)).to.deep.equal([counter, kitchen1, kitchen2, NO_KITCHEN]);

    const operator = await call(GetOrderKanbanPlacesController, request(operatorOf(kitchen1, NO_KITCHEN)));
    expect(operator.body.results.map((place: any) => place.id)).to.deep.equal([kitchen1, NO_KITCHEN]);
    expect(operator.body.results.find((place: any) => place.id === kitchen1).isCookingPoint).to.equal(true);
  });

  it("gives an order without a kitchen the one that will cook it", async function () {
    expect((await ordersOfPlace(NO_KITCHEN)).map((order) => order.id)).to.deep.equal([noKitchen]);

    const result = await assignOrderKitchen({ id: noKitchen }, kitchen1, { user: ADMIN, source: "order-kanban" });

    expect(result.ok && result.placeId).to.equal(kitchen1);
    expect(await ordersOfPlace(NO_KITCHEN)).to.deep.equal([]);
    expect((await ordersOfPlace(kitchen1)).map((order) => order.id)).to.have.members([atKitchen1, noKitchen]);
  });

  it("refuses to re-assign a kitchen, a point that cannot cook, and an order collected by the customer", async function () {
    expect(await assignOrderKitchen({ id: atKitchen1 }, kitchen2, { user: ADMIN, source: "order-kanban" }))
      .to.include({ ok: false, reason: "already_assigned" });
    expect(await assignOrderKitchen({ id: noKitchen }, counter, { user: ADMIN, source: "order-kanban" }))
      .to.include({ ok: false, reason: "no_such_place" });
    expect(await assignOrderKitchen({ id: atCounter }, kitchen1, { user: ADMIN, source: "order-kanban" }))
      .to.include({ ok: false, reason: "not_assignable" });
  });

  it("lets only the holder of «Без кухни» assign one, and only to a kitchen they hold", async function () {
    const stranger = await call(AssignOrderKanbanKitchenController, request(operatorOf(kitchen1), {}, { id: noKitchen, placeId: kitchen1 }));
    expect(stranger.status).to.equal(403);

    const wrongKitchen = await call(AssignOrderKanbanKitchenController, request(operatorOf(NO_KITCHEN, kitchen1), {}, { id: noKitchen, placeId: kitchen2 }));
    expect(wrongKitchen.status).to.equal(403);

    const assigner = await call(AssignOrderKanbanKitchenController, request(operatorOf(NO_KITCHEN, kitchen1), {}, { id: noKitchen, placeId: kitchen1 }));
    expect(assigner.status).to.equal(200);
    expect((await Order.findOne!({ id: noKitchen })).cookingPoints).to.deep.equal([kitchen1]);
  });

  it("writes the move to the journal with who asked and from where", async function () {
    await transitionOrder({ id: atKitchen1 }, "COOKING", { user: ADMIN, source: "mobile-api", data: { device: "device-1" } });

    const logs = await Order.getLogs!({ id: atKitchen1 });
    const entry = logs.find((log) => log.message === "mobile-api: state changed");
    expect(entry, "the move is not in the journal").to.exist;
    expect(entry.data).to.include({ from: "ORDER", to: "COOKING", byUserId: "admin-1", device: "device-1" });
  });
});
