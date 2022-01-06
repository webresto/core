import { expect } from "chai";
import getEmitter from "../../../libs/getEmitter";
import TestPaymentSystem from "../../unit/external_payments/ExternalTestPaymentSystem";

import Order from "../../../models/Order";
import Address from "../../../interfaces/Address";
import Customer from "../../../interfaces/Customer";
import Settings from "../../../models/Settings";
import Dish from "../../../models/Dish";

describe("Flows: Checkout", function () {
  this.timeout(10000);
  var order: Order;

  let customer: Customer = {
    phone: "+79998881212",
    name: "Freeman Morgan",
  };
  let address: Address = {
    streetId: "sdfsf",
    city: "New York",
    street: "Green Road",
    home: "42",
    comment: "",
  };

  let dishes;

  it("Create new order", async function () {
    dishes = await Dish.find({})
    await Order.addDish(order.id, dishes[0], 1, [], "", "test");
    order = await Order.create({}).fetch();
    if (!order) throw "Order not created";
  });

  it("Check paymentSystem", async function () {
    // let cust
    // getEmitter().on('core-order-before-check', (order, customer2, isSelfService, address)=>{
    //   cust = customer2;
    // });

    // expect(cust).to.equal(customer);

    try {

      let paymentSystem = (await PaymentMethod.find().limit(1))[0];
      await Order.check(order.id, customer, false, address, paymentSystem.id);
      await Order.check(order.id, null, null, null, paymentSystem.id);

      try {
        await Order.check(order.id, null, null, null, "bad-id-payment-system");
      } catch (e) {
        expect(e.code).to.equal(8);
        expect(e.error).to.be.an("string");
      }
    } catch (error) {
      throw error;
    }
  });

  it("awaitEmiter order events", async function () {
    await Settings.set("check", { notRequired: true });

    let core_order_before_check = 0;
    let core_order_check_delivery = 0;
    let core_order_check = 0;
    let core_order_after_check = 0;

    getEmitter().on("core-order-before-check", function () {
      core_order_before_check = 1;
    });

    getEmitter().on("core-order-check-delivery", function () {
      core_order_check_delivery = 1;
    });

    getEmitter().on("core-order-check", function () {
      core_order_check = 1;
    });

    getEmitter().on("core-order-after-check", function () {
      core_order_after_check = 1;
    });

    try {
      await Order.check(order.id, customer);
    } catch (e) {
      console.error(e);
    }

    expect(core_order_before_check).to.equal(1);
    expect(core_order_check_delivery).to.equal(1);
    expect(core_order_check).to.equal(1);
    expect(core_order_after_check).to.equal(1);

    let core_order_is_self_service = 0;
    let emitCustomer;
    let emitSelfService;
    let emitAddress;

    getEmitter().on("core-order-is-self-service", function (self, cust, serv, addr) {
      core_order_is_self_service = 1;
      emitCustomer = cust;
      emitSelfService = serv;
      emitAddress = addr;
    });
    try {
      await Order.check(order.id, customer, true, address);
    } catch (e) {
      console.error(e);
    }

    expect(core_order_is_self_service).to.equal(1);
    expect(emitCustomer).to.equal(customer);
    expect(emitSelfService).to.equal(true);
    expect(emitAddress).to.equal(address);
  });

  it("throw if order is Paid (next Only ORDER)", async function () {
    await Order.update(order.id, { state: "PAYMENT", paid: true }).fetch();
    try {
      await Order.check(order.id, customer);
    } catch (e) {
      expect(e).to.not.equal(null);
    }
  });

  it("throw if state ORDER", async function () {
    await Order.next(order.id, "ORDER");
    try {
      await Order.check(order.id, customer);
    } catch (e) {
      expect(e).to.not.equal(null);
    }
  });

  it("test checkConfig (default - requireAll)", async function () {
    await Settings.set("check", null);

    order = await Order.create({}).fetch();

    getEmitter().on("core-order-check", "ccc", function () {
      throw "test";
    });

    // for selfServices
    try {
      await Order.check(order.id, customer, true);
    } catch (e) {
      expect(e.code).to.equal(10);
    }

    // just user with address
    try {
      await Order.check(order.id, customer, false, address);
    } catch (e) {
      expect(e.code).to.equal(10);
    }
  });

  it("test checkConfig (notRequired)", async function () {
    await Settings.set("check", { notRequired: true });
    order = await Order.create({}).fetch();

    // for selfServices
    try {
      await Order.check(order.id, customer, true);
    } catch (e) {
      expect(e).to.equal(null);
    }

    // just user with address
    try {
      await Order.check(order.id, customer, false, address);
    } catch (e) {
      expect(e).to.equal(null);
    }
  });

  describe("check Customer", function () {
    // let order: Order;
    // it('init', async function(){
    //     order = await Order.create({});
    // });

    it("good customer", async function () {
      order = await Order.create({}).fetch();

      let customer: Customer = {
        phone: "+79998881212",
        name: "Freeman Morgan",
      };

      try {
        await Order.check(order.id, customer, true);
      } catch (e) {
        expect(e).to.equal(null);
      }
    });

    it("bad customer", async function () {
      // @ts-ignore
      let badCustomer: Customer = {
        name: "Bad Man",
      };

      let error = null;
      try {
        await Order.check(order.id, badCustomer);
      } catch (e) {
        error = e;
      }
      // expect(error).to.be.an('object');
      expect(error.code).to.equal(2);
      expect(error.error).to.be.an("string");

      // @ts-ignore
      badCustomer = {
        phone: "+79998882244",
      };
      error = null;
      try {
        await Order.check(order.id, badCustomer);
      } catch (e) {
        error = e;
      }
      expect(error.code).to.equal(1);
      expect(error.error).to.be.an("string");
    });

    it("no customer throw", async function () {
      order.customer = null;
      await Order.update({ id: order.id }, order).fetch();
      let error = null;
      try {
        await Order.check({ id: order.id });
      } catch (e) {
        error = e;
      }

      expect(error.code).to.equal(2);
      expect(error.error).to.be.an("string");
    });
  });

  describe("check Address", function () {
    it("good address", async function () {
      order = await Order.create({}).fetch();
      let address: Address = {
        streetId: "1234abcd",
        city: "New York",
        street: "Green Road",
        home: "42",
        comment: "test",
      };

      try {
        await Order.check(order.id, customer, null, address);
      } catch (e) {
        expect(e).to.equal(null);
      }
    });

    it("bad address", async function () {
      // @ts-ignore
      let badAddress: Address = {
        city: "New York",
        // street: 'Green Road',
        home: "42",
        comment: "test",
      };

      try {
        await Order.check(order.id, null, null, badAddress);
      } catch (e) {
        expect(e.code).to.equal(5);
        expect(e.error).to.be.an("string");
      }
    });

    it("no address throw", async function () {
      order.customer = null;
      await Order.update({ id: order.id }, order).fetch();
      try {
        await Order.check(order.id, null, true);
      } catch (e) {
        expect(e.code).to.equal(2);
        expect(e.error).to.be.an("string");
      }
    });
  });

  describe("To payment", function () {
    it("HERE NEED TEST ALL PAYMENT", async function () {

    });
  });
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
