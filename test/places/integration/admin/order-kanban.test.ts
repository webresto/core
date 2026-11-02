import { expect } from "chai";
import AuthService from "../../../../lib/AuthService";
import UpdateOrderKanbanStateController from "../../../../lib/adminpanel/src/controller/update-order-kanban-state";
import { resetDatabase } from "../../support/reset";

/**
 * The orders board of the admin panel ("Move to…"): moving an order to DONE or REJECT finishes it the way
 * Order.doFinalize does — a delivered address becomes a saved one, a guest order is matched to an account by its
 * phone — for an administrator and an operator alike; the other states are a plain move.
 */
describe("Order kanban", function () {
  const STREET_1_12 = { node: null, formatted: "Street 1, 12", city: "City 1", coordinate: { lat: 56.8429, lon: 60.6408 } };
  const ADMIN = { id: "admin-1", isAdministrator: true };
  const OPERATOR = { id: "operator-1", isAdministrator: false, groups: [{ name: "Operator" }] };

  let user1: string;

  beforeEach(async function () {
    await resetDatabase();
    user1 = (await AuthService.materializeUser({ firstName: "Customer", lastName: "1", phone: { code: "1", number: "5550000001", additionalNumber: "" } })).user.id as string;
  });

  /** An order placed (state ORDER) with `values`. */
  async function placed(values: Record<string, unknown>): Promise<string> {
    const order = await Order.create!({}).fetch();
    await Order.update!({ id: order.id }, { ...values, state: "ORDER" }).fetch();
    return order.id as string;
  }

  /** Calls the board's controller the way the admin panel does; resolves to the HTTP status and body. */
  async function move(id: string, nextState: string, user: object = ADMIN): Promise<{ status: number; body: any }> {
    return await new Promise((resolve) => {
      let status = 200;
      const res = {
        status(code: number) { status = code; return res; },
        json(body: any) { resolve({ status, body }); return res; },
        sendStatus(code: number) { resolve({ status: code, body: null }); return res; },
        redirect() { resolve({ status: 302, body: null }); return res; },
      };
      void UpdateOrderKanbanStateController({ body: { id, nextState }, user, adminizer: { config: {} } }, res);
    });
  }

  it("saves the address of a delivery moved to DONE", async function () {
    const id = await placed({ user: user1, serviceType: "delivery", address: STREET_1_12 });

    for (const state of ["COOKING", "ON_THE_WAY", "DONE"]) expect((await move(id, state)).status).to.equal(200);

    expect((await Order.findOne!({ id })).state).to.equal("DONE");
    const [location] = await UserLocation.find!({ user: user1 });
    expect(location?.formatted).to.equal("Street 1, 12");
  });

  it("finishes an order an operator moves to DONE the same way", async function () {
    const id = await placed({ user: user1, serviceType: "delivery", address: STREET_1_12 });

    expect((await move(id, "DONE", OPERATOR)).status).to.equal(200);

    expect((await Order.findOne!({ id })).state).to.equal("DONE");
    expect(await UserLocation.find!({ user: user1 })).to.have.length(1);
  });

  it("matches a guest order moved to DONE to the account of its phone", async function () {
    const id = await placed({ user: null, serviceType: "delivery", address: STREET_1_12, customer: { name: "Customer 1", phone: { code: "1", number: "5550000001", additionalNumber: "" } } });

    await move(id, "DONE");

    const order = await Order.findOne!({ id });
    expect(order.user).to.equal(user1);
    expect(await UserLocation.find!({ user: user1 })).to.have.length(1);
  });

  it("rejects without saving anything", async function () {
    const id = await placed({ user: user1, serviceType: "delivery", address: STREET_1_12 });

    expect((await move(id, "REJECT")).status).to.equal(200);

    expect((await Order.findOne!({ id })).state).to.equal("REJECT");
    expect(await UserLocation.find!({ user: user1 })).to.have.length(0);
  });

  it("refuses a move the state flow does not allow", async function () {
    const id = await placed({ user: user1, serviceType: "delivery", address: STREET_1_12 });
    await move(id, "DONE");

    expect((await move(id, "COOKING")).status).to.equal(403);
    expect((await Order.findOne!({ id })).state).to.equal("DONE");
  });
});
