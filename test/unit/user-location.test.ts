import { expect } from "chai";

const OrderModel = require("../../models/Order");
const UserLocationModel = require("../../models/UserLocation");

/**
 * Saved addresses, written by delivered orders and by nothing else.
 *
 * `Order.doFinalize` is run against in-memory rows: what matters is which
 * orders leave a location behind and that the same line is never kept twice.
 */
describe("UserLocation from a finished order", function () {
  type Row = Record<string, any>;

  const realGlobals: Row = {};
  let locations: Row[] = [];
  let orders: Row[] = [];

  const matches = (row: Row, criteria: Row) => Object.entries(criteria).every(([key, value]) => row[key] === value);

  before(function () {
    for (const name of ["Order", "UserLocation", "User", "Settings"]) realGlobals[name] = (global as any)[name];

    (global as any).Order = {
      ...OrderModel,
      findOne: async (criteria: Row) => orders.find((row) => matches(row, criteria)),
      update: (criteria: Row, values: Row) => ({
        fetch: async () => orders.filter((row) => matches(row, criteria)).map((row) => Object.assign(row, values)),
      }),
      log: async () => {},
      next: async () => {},
      emitAndLogDetached: () => {},
    };

    (global as any).UserLocation = {
      ...UserLocationModel,
      findOne: async (criteria: Row) => locations.find((row) => matches(row, criteria)),
      create: (values: Row) => ({
        fetch: async () => {
          await new Promise((resolve) => UserLocationModel.beforeCreate(values, resolve));
          locations.push(values);
          return values;
        },
      }),
    };

    (global as any).User = { findOne: async () => ({ id: "user-by-phone" }) };
    (global as any).Settings = { get: async () => undefined };
  });

  after(function () {
    for (const name of Object.keys(realGlobals)) (global as any)[name] = realGlobals[name];
  });

  beforeEach(function () {
    locations = [];
    orders = [];
  });

  let counter = 0;
  async function finish(values: Row, state: "DONE" | "REJECT" = "DONE"): Promise<void> {
    const id = `order-${++counter}`;
    orders.push({ id, serviceType: "delivery", user: "user-1", ...values });
    await OrderModel.doFinalize({ id }, state);
  }

  const lenina97 = {
    node: "lenina-97",
    formatted: "Ленина, 97",
    city: "Город",
    apartment: "5",
    coordinate: { lat: 56.8429, lon: 60.6408 },
  };

  it("keeps the address of the first delivery, without its catalog node", async function () {
    await finish({ address: lenina97 });

    expect(locations).to.have.length(1);
    expect(locations[0]).to.include({ user: "user-1", formatted: "Ленина, 97", name: "Ленина, 97", city: "Город", apartment: "5" });
    expect(locations[0].coordinate).to.deep.equal({ lat: 56.8429, lon: 60.6408 });
    expect(locations[0]).to.not.have.property("node");
  });

  it("does not keep the same line twice", async function () {
    await finish({ address: lenina97 });
    await finish({ address: { ...lenina97, apartment: "7" } });

    expect(locations).to.have.length(1);
    expect(locations[0].apartment).to.equal("5");
  });

  it("recognises its own line when the saved location comes back as the address", async function () {
    const range = { node: "malysheva-low", formatted: "Малышева, 45", home: "45", coordinate: { lat: 56.836, lon: 60.61 } };
    await finish({ address: range });
    const { node, ...saved } = locations[0];
    await finish({ address: { ...saved, node: null } });

    expect(locations).to.have.length(1);
  });

  it("puts the house number of free text into the line, so two houses are two locations", async function () {
    await finish({ address: { node: null, formatted: "Ленина", home: "97" } });
    await finish({ address: { node: null, formatted: "Ленина", home: "12" } });
    await finish({ address: { node: null, formatted: "Ленина, 97", home: "97" } });

    expect(locations.map((row) => row.formatted)).to.deep.equal(["Ленина, 97", "Ленина, 12"]);
  });

  it("keeps it for the user the order was matched to by phone", async function () {
    await finish({ user: null, customer: { phone: { code: "+7", number: "9990000000", additionalNumber: "" } }, address: lenina97 });

    expect(locations[0].user).to.equal("user-by-phone");
  });

  it("keeps each user's addresses apart", async function () {
    await finish({ address: lenina97 });
    await finish({ user: "user-2", address: lenina97 });

    expect(locations.map((row) => row.user)).to.deep.equal(["user-1", "user-2"]);
  });

  it("keeps nothing from a pickup or a rejected delivery", async function () {
    await finish({ serviceType: "pickup", address: lenina97 });
    await finish({ address: lenina97 }, "REJECT");

    expect(locations).to.deep.equal([]);
  });

  describe("coming back as the address of the next order", function () {
    /** `doCart` is the shortest way to `checkAddress`. */
    async function cart(address: Row): Promise<unknown> {
      orders.push({ id: "cart", state: "NEW", serviceType: "delivery", address });
      try {
        await OrderModel.doCart({ id: "cart" });
        return undefined;
      } catch (error) {
        return error;
      }
    }

    it("needs no house number: the line has it and the point is the door", async function () {
      await finish({ address: lenina97 });
      const { id, name, user, ...saved } = locations[0];

      expect(await cart({ ...saved, node: null })).to.equal(undefined);
    });

    it("still needs one for free text without a point", async function () {
      expect(await cart({ node: null, formatted: "Ленина", city: "Город" })).to.include({ code: 6 });
    });
  });
});
