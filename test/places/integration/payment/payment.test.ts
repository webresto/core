import { expect } from "chai";
import { resetDatabase } from "../../support/reset";
import { startPaymentSystem, TestPaymentSystem } from "../../support/payment";
import { add, CUSTOMER, newBasket, pickUpAt, thrown } from "../../support/storefront";

/**
 * Paying for an order. A payment method is a promise (cash, card on
 * delivery — no system to ask) or an external system that has registered
 * itself with core. A payment document is registered with the system, checked
 * until it says paid, and a paid document pays its order, which is then placed.
 *
 *   City 1, Kitchen 1; Dish 1 at 100. Payment 1 is the external test system,
 *   Payment 2 a promise.
 */
describe("Payment", function () {
  let system: TestPaymentSystem;
  let external: string;
  let promise: string;
  let kitchen1: string;
  let dish1: string;

  before(async function () {
    await resetDatabase();
    ({ system, paymentMethod: external } = await startPaymentSystem());
    promise = (await PaymentMethod.create({ title: "Payment 2", type: "promise", adapter: "payment-2", enable: true, sortOrder: 1 }).fetch()).id;

    const city = (await City.create({ name: "City 1" }).fetch()).id;
    kitchen1 = (await Place.create({ title: "Kitchen 1", city, enable: true, isCookingPoint: true, isPickupPoint: true }).fetch()).id;
    const group = await Group.create({ name: "Group 1", enable: true }).fetch();
    dish1 = (await Dish.create({ name: "Dish 1", price: 100, enable: true, parentGroup: group.id }).fetch()).id;
  });

  /** A basket at checkout, to be picked up at Kitchen 1 and paid with `paymentMethod`. */
  async function checkedOut(paymentMethod: string): Promise<string> {
    const id = await newBasket();
    await add(id, dish1);
    await pickUpAt(id, kitchen1);
    await Order.check({ id }, CUSTOMER, "pickup", undefined, paymentMethod);
    return id;
  }
  const documentOf = async (orderId: string) => (await PaymentDocument.find({ originModelId: orderId }))[0];

  describe("payment methods", function () {
    it("an external system registers its method when it starts; a promise needs none", async function () {
      expect(await PaymentMethod.findOne({ adapter: "payment-1" })).to.include({ type: "external", title: "Payment 1" });
      expect(await PaymentMethod.isPaymentPromise(promise)).to.equal(true);
      expect(await PaymentMethod.isPaymentPromise(external)).to.equal(false);
    });

    it("gives the running system of an external method, and none for a promise", async function () {
      expect(await PaymentMethod.getAdapter("payment-1")).to.equal(system);
      expect(await PaymentMethod.getAdapter("payment-2")).to.equal(undefined);
      expect(await PaymentMethod.getAdapterById(external)).to.equal(system);
      expect(String(await thrown(PaymentMethod.getAdapterById(promise)))).to.contain("not have adapter");
    });

    it("offers what is on: promises, and external methods whose system is running", async function () {
      const dead = (await PaymentMethod.create({ title: "Payment 3", type: "external", adapter: "payment-3", enable: true }).fetch()).id;
      const off = (await PaymentMethod.create({ title: "Payment 4", type: "promise", adapter: "payment-4", enable: false }).fetch()).id;

      expect((await PaymentMethod.getAvailable()).map((method: any) => method.title)).to.have.members(["Payment 1", "Payment 2"]);
      expect(await PaymentMethod.checkAvailable(external)).to.equal(true);
      expect(await PaymentMethod.checkAvailable(promise)).to.equal(true);
      expect(await PaymentMethod.checkAvailable(dead)).to.equal(false);
      expect(await PaymentMethod.checkAvailable(off)).to.equal(false);
      expect(await PaymentMethod.checkAvailable("payment-9")).to.equal(false);
    });
  });

  describe("a payment document", function () {
    it("is refused for no amount, an origin that does not exist, or a method that is not available", async function () {
      const id = await newBasket();
      expect(await thrown(PaymentDocument.register(id, "order", 0, external, "", "", "", {}))).to.deep.include({ code: 2 });
      expect(await thrown(PaymentDocument.register("order-9", "order", 100, external, "", "", "", {}))).to.deep.include({ code: 1 });
      expect(await thrown(PaymentDocument.register(id, "order", 100, "payment-9", "", "", "", {}))).to.deep.include({ code: 4 });
    });

    it("is registered with the system and carries its link", async function () {
      const id = await newBasket();
      const response = await PaymentDocument.register(id, "order", 100, external, "", "", "", {});

      expect(await documentOf(id)).to.include({ status: "REGISTERED", redirectLink: response.redirectLink, externalId: `external-${response.id}`, amount: 100 });
    });

    it("is checked until the system says paid, then marked paid", async function () {
      const id = await newBasket();
      const response = await PaymentDocument.register(id, "order", 100, external, "", "", "", {});

      await PaymentDocument.doCheck({ id: response.id });
      expect((await documentOf(id)).paid).to.equal(false);

      system.pay(response.id);
      await PaymentDocument.doCheck({ id: response.id });
      expect(await documentOf(id)).to.include({ status: "PAID", paid: true });
    });

    it("is cancelled with the system while pending, and left alone once paid", async function () {
      const pending = await newBasket();
      const first = await PaymentDocument.register(pending, "order", 100, external, "", "", "", {});
      await PaymentDocument.cancel({ id: first.id });
      expect((await documentOf(pending)).status).to.equal("CANCEL");
      expect(system.cancelled).to.include(first.id);

      const paid = await newBasket();
      const second = await PaymentDocument.register(paid, "order", 100, external, "", "", "", {});
      await PaymentDocument.update({ id: second.id }, { status: "PAID" }).fetch();
      await PaymentDocument.cancel({ id: second.id });
      expect((await documentOf(paid)).status).to.equal("PAID");
      expect(system.cancelled).to.not.include(second.id);
    });

    it("the processor checks registered documents and declines those left for over an hour", async function () {
      const fresh = await newBasket();
      const stale = await newBasket();
      const freshPayment = await PaymentDocument.register(fresh, "order", 100, external, "", "", "", {});
      const stalePayment = await PaymentDocument.register(stale, "order", 100, external, "", "", "", {});
      await (PaymentDocument.update({ id: stalePayment.id }, { createdAt: Date.now() - 2 * 60 * 60_000 }) as any).meta({ skipAllLifecycleCallbacks: true }).fetch();
      system.pay(freshPayment.id);

      const interval = await PaymentDocument.processor(20);
      try {
        await new Promise((resolve) => setTimeout(resolve, 150));
      } finally {
        clearInterval(interval);
      }

      expect((await documentOf(fresh)).status).to.equal("PAID");
      expect((await documentOf(stale)).status).to.equal("DECLINE");
    });
  });

  describe("an order", function () {
    it("paid by a promise is placed straight from checkout", async function () {
      const id = await checkedOut(promise);
      expect(await Order.findOne({ id })).to.deep.include({ paymentMethod: promise, isPaymentPromise: true });

      await Order.order({ id });
      expect((await Order.findOne({ id })).state).to.equal("ORDER");
    });

    it("paid through the system: checkout, the payment link, paid in the gateway, placed", async function () {
      const id = await checkedOut(external);

      const response = await Order.payment({ id });
      expect((await Order.findOne({ id })).state).to.equal("PAYMENT");
      expect(response.redirectLink).to.contain("https://payment.example/");

      system.pay(response.id);
      await PaymentDocument.doCheck({ id: response.id });

      const order = await Order.findOne({ id });
      expect(order).to.deep.include({ paid: true, state: "ORDER", paymentMethod: external, paymentMethodTitle: "Payment 1" });
    });

    it("cannot be paid from anywhere but checkout", async function () {
      const id = await newBasket();
      await add(id, dish1);
      expect(String(await thrown(Order.payment({ id })))).to.contain("need CHECKOUT");
    });

    it("once paid, is not paid twice and not taken back to the basket", async function () {
      const id = await checkedOut(external);
      const response = await Order.payment({ id });
      system.pay(response.id);
      await PaymentDocument.doCheck({ id: response.id });

      await Order.doPaid({ id }, await documentOf(id));
      expect((await Order.findOne({ id })).state).to.equal("ORDER");
      await Order.update({ id }, { state: "PAYMENT" }).fetch();
      expect(String(await thrown(Order.next(id, "CART")))).to.contain("already paid");
    });
  });
});
