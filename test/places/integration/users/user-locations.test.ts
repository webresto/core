import { expect } from "chai";
import AuthService from "../../../../lib/AuthService";
import { wholeLine } from "../../../../lib/user-location";
import { resetDatabase } from "../../support/reset";
import { thrown } from "../../support/storefront";

/**
 * A customer's saved addresses: written as a delivery is placed (a guest's —
 * when it is delivered and the guest is matched to an account by phone) and by
 * `remember` itself (the profile adds one) — one per line, without the catalog
 * node. A saved address comes back as the next order's address and passes
 * checkout's address check as it is. One of them is the customer's default.
 */
describe("User locations", function () {
  const STREET_1_12 = {
    node: "node-1",
    formatted: "Street 1, 12",
    city: "City 1",
    apartment: "5",
    coordinate: { lat: 56.8429, lon: 60.6408 },
  };

  let user1: string;
  let user2: string;

  beforeEach(async function () {
    await resetDatabase();
    // Through the one User factory, so each number is the phone identity a guest order is matched by.
    user1 = (await AuthService.materializeUser({ firstName: "Customer", lastName: "1", phone: { code: "1", number: "5550000001", additionalNumber: "" } })).user.id;
    user2 = (await AuthService.materializeUser({ firstName: "Customer", lastName: "2", phone: { code: "1", number: "5550000002", additionalNumber: "" } })).user.id;
  });

  /** A basket of user 1 with `values`, placed. A new order is always a delivery, so the rest is written after. */
  async function place(values: Record<string, unknown>): Promise<string> {
    const order = await Order.create({}).fetch();
    await Order.update({ id: order.id }, { user: user1, ...values, state: "CHECKOUT" }).fetch();
    await Order.order({ id: order.id });
    return order.id;
  }
  /** An order with `values` that reached the kitchen without being placed here, finished as `state`. */
  async function finish(values: Record<string, unknown>, state: "DONE" | "REJECT" = "DONE"): Promise<void> {
    const order = await Order.create({}).fetch();
    await Order.update({ id: order.id }, { user: user1, ...values, state: "ORDER" }).fetch();
    await Order.doFinalize({ id: order.id }, state);
  }
  const saved = async () => UserLocation.find({}).sort("createdAt ASC");
  const GUEST_2 = { user: null, customer: { name: "Customer 2", phone: { code: "1", number: "5550000002", additionalNumber: "" } } };

  it("keeps the address of a placed delivery, without its catalog node", async function () {
    await place({ address: STREET_1_12 });

    const [location] = await saved();
    expect(location).to.include({ user: user1, formatted: "Street 1, 12", name: "Street 1, 12", city: "City 1", apartment: "5" });
    expect(location.coordinate).to.deep.equal(STREET_1_12.coordinate);
    expect((location as any).node ?? null).to.equal(null);
  });

  it("does not keep the same line twice", async function () {
    await place({ address: STREET_1_12 });
    await place({ address: { ...STREET_1_12, apartment: "7" } });

    const locations = await saved();
    expect(locations).to.have.length(1);
    expect(locations[0].apartment).to.equal("5");
  });

  it("knows its own line when the saved address comes back as the order's", async function () {
    await place({ address: { node: "node-2", formatted: "Street 2, 45", home: "45", coordinate: { lat: 56.836, lon: 60.61 } } });
    const [location] = await saved();

    await place({ address: { formatted: location.formatted, home: location.home, coordinate: location.coordinate, node: null } });

    expect(await saved()).to.have.length(1);
  });

  it("puts the house number of free text into the line, so two houses are two addresses", async function () {
    await place({ address: { node: null, formatted: "Street 1", home: "12" } });
    await place({ address: { node: null, formatted: "Street 1", home: "14" } });
    await place({ address: { node: null, formatted: "Street 1, 12", home: "12" } });

    expect((await saved()).map((location: any) => location.formatted)).to.deep.equal(["Street 1, 12", "Street 1, 14"]);
  });

  it("keeps a guest's delivered address for the customer the order was matched to by phone", async function () {
    await place({ ...GUEST_2, address: STREET_1_12 });
    expect(await saved()).to.deep.equal([]);

    await finish({ ...GUEST_2, address: STREET_1_12 });
    expect((await saved())[0].user).to.equal(user2);
  });

  it("keeps each customer's addresses apart", async function () {
    await place({ address: STREET_1_12 });
    await place({ user: user2, address: STREET_1_12 });

    expect((await saved()).map((location: any) => location.user)).to.deep.equal([user1, user2]);
  });

  it("keeps nothing from a pickup or a guest's rejected delivery", async function () {
    await place({ serviceType: "pickup", address: STREET_1_12 });
    await finish({ ...GUEST_2, address: STREET_1_12 }, "REJECT");

    expect(await saved()).to.deep.equal([]);
  });

  it("does not bring back an address the customer deleted when their order is delivered", async function () {
    const id = await place({ address: STREET_1_12 });
    await UserLocation.destroy!({}).fetch();

    await Order.doFinalize({ id }, "DONE");

    expect(await saved()).to.deep.equal([]);
  });

  it("tells whether an address is new to the customer", async function () {
    expect(await UserLocation.remember(user1, STREET_1_12)).to.equal(true);
    expect(await UserLocation.remember(user1, { ...STREET_1_12, apartment: "7" })).to.equal(false);
    expect(await UserLocation.remember(user2, STREET_1_12)).to.equal(true);
  });

  describe("as the address of the next order", function () {
    /** `doCart` is the shortest way to checkout's address check. */
    async function cart(address: Record<string, unknown>): Promise<unknown> {
      const order = await Order.create({ serviceType: "delivery", address }).fetch();
      return thrown(Order.doCart({ id: order.id }));
    }

    it("needs no house number: the line has it and the point is the door", async function () {
      await place({ address: STREET_1_12 });
      const [location] = await saved();

      expect(await cart({ formatted: location.formatted, city: location.city, coordinate: location.coordinate, node: null })).to.equal(null);
    });

    it("free text without a point still needs one", async function () {
      expect(await cart({ node: null, formatted: "Street 1", city: "City 1" })).to.deep.include({ code: 6 });
    });
  });

  describe("the default", function () {
    it("moves among the customer's own addresses and leaves other customers alone", async function () {
      const home1 = await UserLocation.create({ user: user1, name: "Location 1", formatted: "Street 1, 1", isDefault: true }).fetch();
      const work1 = await UserLocation.create({ user: user1, name: "Location 2", formatted: "Street 1, 2", isDefault: false }).fetch();
      const home2 = await UserLocation.create({ user: user2, name: "Location 3", formatted: "Street 1, 3", isDefault: true }).fetch();

      expect((await UserLocation.setDefault(user1, work1.id)).id).to.equal(work1.id);

      const defaults = (await UserLocation.find({ isDefault: true })).map((location: any) => location.id);
      expect(defaults).to.have.members([work1.id, home2.id]);
      expect(defaults).to.not.include(home1.id);
    });

    it("refuses another customer's address and changes nothing", async function () {
      const home2 = await UserLocation.create({ user: user2, name: "Location 3", formatted: "Street 1, 3", isDefault: true }).fetch();

      expect(await thrown(UserLocation.setDefault(user1, home2.id))).to.equal("User location not found");
      expect((await UserLocation.findOne({ id: home2.id })).isDefault).to.equal(true);
    });
  });

  it("adds the house number to a line only when the line does not end with it", function () {
    expect(wholeLine("Street 1", "12")).to.equal("Street 1, 12");
    expect(wholeLine("Street 1, 12", "12")).to.equal("Street 1, 12");
  });
});
