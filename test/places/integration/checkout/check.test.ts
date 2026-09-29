import { expect } from "chai";
import { resetDatabase } from "../../support/reset";
import { add, CUSTOMER, deliverTo, newBasket, pickUpAt, thrown } from "../../support/storefront";

/**
 * What `Order.check` asks of a basket before it becomes an order, and what
 * `Order.order` does with it: the customer, the address, the payment method,
 * the state the basket is in, maintenance, the events on the way and how the
 * checkout strategy treats their subscribers.
 *
 *   City 1, Kitchen 1 (cooks, hands orders over) inside Zone 1; Dish 1.
 */
describe("Checkout: check and order", function () {
  const ZONE_1 = [[9.9, 9.9], [10.1, 9.9], [10.1, 10.1], [9.9, 10.1], [9.9, 9.9]];
  const IN_ZONE_1 = { lat: 10.0, lon: 10.01 };

  let kitchen1: string;
  let dish1: string;
  let paymentMethod1: string;

  before(async function () {
    await resetDatabase();
    const city = await City.create({ name: "City 1" }).fetch();
    kitchen1 = (await Place.create({
      title: "Kitchen 1", city: city.id, coordinate: { lat: 10, lon: 10 }, enable: true,
      isCookingPoint: true, isPickupPoint: true, hasDiningArea: true,
    }).fetch()).id;
    await DeliveryZone.create({ name: "Zone 1", polygon: ZONE_1, deliveryCost: 100, minDeliveryTime: 30 }).fetch();
    const group = await Group.create({ name: "Group 1", enable: true }).fetch();
    dish1 = (await Dish.create({ name: "Dish 1", price: 100, enable: true, parentGroup: group.id }).fetch()).id;
    paymentMethod1 = (await PaymentMethod.create({ title: "Payment 1", type: "promise", adapter: "payment-1", enable: true }).fetch()).id;
  });

  /** A basket with Dish 1, to be picked up at Kitchen 1. */
  async function pickupBasket(): Promise<string> {
    const id = await newBasket();
    await add(id, dish1);
    await pickUpAt(id, kitchen1);
    return id;
  }

  const check = (id: string, customer: any = CUSTOMER, ...rest: any[]) =>
    thrown(Order.check({ id }, customer, ...rest));
  const state = async (id: string) => (await Order.findOne({ id })).state;

  it("takes a basket with a customer to checkout", async function () {
    const id = await pickupBasket();
    expect(await check(id, CUSTOMER, "pickup")).to.equal(null);
    expect(await state(id)).to.equal("CHECKOUT");
    expect((await Order.findOne({ id })).customer).to.deep.include({ name: CUSTOMER.name });
  });

  it("refuses an empty basket", async function () {
    const id = await newBasket();
    await pickUpAt(id, kitchen1);
    expect(await check(id)).to.deep.include({ code: 13 });
  });

  describe("the customer", function () {
    it("needs a name and a whole phone", async function () {
      const id = await pickupBasket();
      expect(await check(id, { phone: CUSTOMER.phone })).to.deep.include({ code: 1 });
      expect(await check(id, { name: "Customer 1" })).to.deep.include({ code: 2 });
      expect(await check(id, { name: "Customer 1", phone: { code: "+1" } })).to.deep.include({ code: 2 });
    });

    it("is required when the basket has none of its own", async function () {
      const id = await pickupBasket();
      expect(await check(id, null)).to.deep.include({ code: 2, error: "customer is required" });
    });

    it("given once, is kept for the next check", async function () {
      const id = await pickupBasket();
      await check(id, CUSTOMER, "pickup");
      expect(await check(id, null)).to.equal(null);
    });
  });

  describe("the address of a delivery", function () {
    before(async function () {
      await Settings.set("SOFT_DELIVERY_CALCULATION", { value: false });
    });

    after(async function () {
      await Settings.set("SOFT_DELIVERY_CALCULATION", { value: true });
    });

    async function deliveryBasket(): Promise<string> {
      const id = await newBasket();
      await add(id, dish1);
      await deliverTo(id, { city: "City 1", formatted: "Street 1", home: "1", coordinate: IN_ZONE_1 });
      return id;
    }

    it("needs a line or a catalog node, a house number, and a city unless it has a coordinate", async function () {
      const id = await deliveryBasket();
      expect(await check(id, CUSTOMER, "delivery", { city: "City 1", home: "1" })).to.deep.include({ code: 5 });
      expect(await check(id, CUSTOMER, "delivery", { city: "City 1", formatted: "Street 1" })).to.deep.include({ code: 6 });
      expect(await check(id, CUSTOMER, "delivery", { formatted: "Street 1", home: "1" })).to.deep.include({ code: 7 });
      expect(await check(id, CUSTOMER, "delivery", { formatted: "Street 1", home: "1", coordinate: IN_ZONE_1 })).to.equal(null);
    });

    it("is required when the basket has none", async function () {
      const id = await newBasket();
      await add(id, dish1);
      expect(await check(id, CUSTOMER, "delivery")).to.deep.include({ code: 5, error: "address is required" });
    });
  });

  it("refuses a service type core does not know", async function () {
    const id = await pickupBasket();
    expect(String(await check(id, CUSTOMER, "teleport"))).to.contain("unknown serviceType");
  });

  it("writes the payment method and its title, and refuses one that does not exist", async function () {
    const id = await pickupBasket();
    expect(await check(id, CUSTOMER, "pickup", undefined, "payment-9")).to.deep.include({ code: 8 });

    expect(await check(id, CUSTOMER, "pickup", undefined, paymentMethod1)).to.equal(null);
    expect(await Order.findOne({ id })).to.deep.include({ paymentMethod: paymentMethod1, paymentMethodTitle: "Payment 1" });
  });

  it("refuses a paid basket and an order already placed", async function () {
    const paid = await pickupBasket();
    await Order.update({ id: paid }, { paid: true }).fetch();
    expect(await check(paid)).to.deep.include({ code: 12 });

    const placed = await pickupBasket();
    await check(placed, CUSTOMER, "pickup");
    await Order.order({ id: placed });
    expect(String(await check(placed))).to.contain("in state ORDER");
  });

  it("refuses to check out or place anything during maintenance", async function () {
    const id = await pickupBasket();
    await check(id, CUSTOMER, "pickup");
    const maintenance = await Maintenance.create({
      title: "Maintenance 1", enable: true,
      startDate: new Date(Date.now() - 60_000).toISOString(),
      stopDate: new Date(Date.now() + 60 * 60_000).toISOString(),
    }).fetch();

    try {
      expect(String(await check(id))).to.contain("site is off");
      expect(String(await thrown(Order.order({ id })))).to.contain("site is off");
    } finally {
      await Maintenance.destroy({ id: maintenance.id }).fetch();
    }
  });

  describe("placing the order", function () {
    it("takes a checked basket to ORDER once, and refuses a basket still in CART", async function () {
      const cart = await pickupBasket();
      expect(String(await thrown(Order.order({ id: cart })))).to.contain("in state CART");

      const id = await pickupBasket();
      await check(id, CUSTOMER, "pickup");
      await Order.order({ id });

      const order = await Order.findOne({ id });
      expect(order.state).to.equal("ORDER");
      expect(order.orderedAt).to.be.a("number");
      expect(String(await thrown(Order.order({ id })))).to.contain("in state ORDER");
    });
  });

  /**
   * One subscriber per event for the whole file — `emitter.off` does not
   * unsubscribe — recording what it was called with and failing on demand.
   */
  describe("events and the checkout strategy", function () {
    const calls: Record<string, any[][]> = {};
    let failCheck = false;

    before(function () {
      const events = [
        "core:order-before-check", "core:order-service-type", "core:order-check",
        "core:order-after-check-counting", "core:order-before-order", "core:order-order-service-type",
      ] as const;
      for (const event of events) {
        calls[event] = [];
        emitter.on(event, "checkout-test", (...args: any[]) => {
          calls[event].push(args);
          if (event === "core:order-check" && failCheck) throw new Error("Subscriber 1 refused");
        });
      }
    });

    beforeEach(function () {
      for (const event of Object.keys(calls)) calls[event] = [];
      failCheck = false;
    });

    after(async function () {
      failCheck = false;
      await Settings.set("EMITTER_CHECKOUT_STRATEGY", { value: "NOT_REQUIRED" });
    });

    /** Detached events are not awaited by the caller. */
    const settle = () => new Promise((resolve) => setTimeout(resolve, 50));

    it("check announces itself, the service type, the check and the recount; order its placing", async function () {
      const id = await pickupBasket();
      await check(id, CUSTOMER, "pickup");
      await Order.order({ id });
      await settle();

      for (const event of Object.keys(calls)) expect(calls[event], event).to.have.length(1);
      const [, customer, serviceType] = calls["core:order-service-type"][0];
      expect(customer).to.deep.include({ name: CUSTOMER.name });
      expect(serviceType).to.equal("pickup");
      expect(calls["core:order-order-service-type"][0][1]).to.equal("pickup");
    });

    it("by default a subscriber that fails the check does not stop it", async function () {
      failCheck = true;
      const id = await pickupBasket();

      expect(await check(id, CUSTOMER, "pickup")).to.equal(null);
      expect(await state(id)).to.equal("CHECKOUT");
    });

    it("ALL_REQUIRED: a subscriber that fails the check stops it", async function () {
      await Settings.set("EMITTER_CHECKOUT_STRATEGY", { value: "ALL_REQUIRED" });
      failCheck = true;
      const id = await pickupBasket();

      const error = await check(id, CUSTOMER, "pickup");

      expect(error.code).to.equal(0);
      expect(error.error).to.contain("Subscriber 1 refused");
      expect(await state(id)).to.equal("CART");
    });
  });
});
