import { expect } from "chai";
import TestPaymentSystem from "../../unit/external_payments/ExternalTestPaymentSystem";

import Order from "../../../models/Order";
import Address from "../../../interfaces/Address";
import Customer from "../../../interfaces/Customer";
import Settings from "../../../models/Settings";
import Dish from "../../../models/Dish";
import { address, customer } from "../../mocks/customer";

describe("Flows: Checkout", function () {
  this.timeout(10000);
  var order: Order;


  let dishes;

  it("Check dishescount", async function () {
    await sleep(500)
    order = await Order.create({id:"test.order.check-dishescount"}).fetch();
    dishes = await Dish.find({})
    await Order.addDish({id: order.id}, dishes[0], 1, [], "", "user");
    order = await Order.findOne({id:"test.order.check-dishescount"});

    if (!order) throw "Order not created";
    if (order.dishesCount !== 1 ) throw `Order dishescount: ${order.dishesCount} ${JSON.stringify(order)}`
  });

  it("Check paymentSystem", async function () {
    try {
      let paymentSystem = (await PaymentMethod.find().limit(1))[0];
      await Order.check({id: order.id}, customer, false, address, paymentSystem.id);
      await Order.check({id: order.id}, null, null, null, paymentSystem.id);

      try {
        await Order.check({id: order.id}, null, null, null, "bad-id-payment-system");
      } catch (e) {
        expect(e.code).to.equal(8);
        expect(e.error).to.be.an("string");
      }
    } catch (error) {
      throw error;
    }
  });

  it("awaitEmitter order events", async function () {
    //@ts-ignore
    await Settings.set("CHECKOUT_STRATEGY", {key: "CHECKOUT_STRATEGY", value: { notRequired: true }, jsonSchema: {
      type: "object",
      properties: {
        notRequired: {
          type: "boolean"
        }
      }
    }});

    let core_order_before_check = 0;
    let core_order_check_delivery = 0;
    let core_order_check = 0;
    let core_order_after_check = 0;

    emitter.on("core:order-before-check","test", function () {
      core_order_before_check = 1;
    });

    emitter.on("core:order-check-delivery","test", function () {
      core_order_check_delivery = 1;
    });

    emitter.on("core:order-check","test", function () {
      core_order_check = 1;
    });

    emitter.on("core:order-after-check-counting","test", function () {
      core_order_after_check = 1;
    });

    try {
      await Order.check({id: order.id}, customer);
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

    emitter.on("core:order-is-self-service", "test", function (self, cust, serv, addr) {
      core_order_is_self_service = 1;
      emitCustomer = cust;
      emitSelfService = serv;
      emitAddress = addr;
    });
    try {
      await Order.check({id: order.id}, customer, true, address);
    } catch (e) {
      console.error(e);
    }

    expect(core_order_is_self_service).to.equal(1);
    expect(emitCustomer).to.equal(customer);
    expect(emitSelfService).to.equal(true);
    expect(emitAddress).to.equal(address);
  });

  it("throw if order is Paid (next Only ORDER)", async function () {
    await Order.update({id: order.id}, { state: "PAYMENT", paid: true }).fetch();
    try {
      await Order.check({id: order.id}, customer);
    } catch (e) {
      expect(e).be.not.undefined;
    }
  });

  it("throw if state ORDER", async function () {
    await Order.next(order.id, "ORDER");
    try {
      await Order.check({id: order.id}, customer);
    } catch (e) {
      expect(e).be.not.undefined;
    }
  });

  it("test checkConfig (default - requireAll)", async function () {

    emitter.on("core:order-check", "test checkConfig (default - requireAll)", function () {
      throw "test";
    });


    await sleep(500)
    order = await Order.create({id: "test-checkconfig-default-requireall"}).fetch();
    await Order.addDish({id: order.id}, dishes[0], 1, [], "", "user");
    order = await Order.findOne({id: order.id});

    await Settings.set("CHECKOUT_STRATEGY", {key: "CHECKOUT_STRATEGY", value: {}, jsonSchema: {"type": "object"}});

    try {
      await Order.check({id: order.id}, customer, true);
    } catch (e) {
      expect(e.code).to.equal(0);
    }

    // just user with address
    try {
      await Order.check({id: order.id}, customer, false, address);
    } catch (e) {
      console.error(e)
      expect(e.code).to.equal(0);
    }
  });

  it("test checkConfig (notRequired)", async function () {
    await Settings.set("CHECKOUT_STRATEGY", {key: "CHECKOUT_STRATEGY", value: { notRequired: true }, jsonSchema: {
      type: "object",
          properties: {
        notRequired: {
          type: "boolean"
        }
      }
    }});

    await sleep(500)
    order = await Order.create({id: "test-checkconfig-notrequired"}).fetch();
    await Order.addDish({id: order.id}, dishes[0], 1, [], "", "user");
    order = await Order.findOne({id: order.id});

    // for selfServices
    try {
      await Order.check({id: order.id}, customer, true);
    } catch (e) {
      expect(e).be.undefined;
    }

    // just user with address
    try {
      await Order.check({id: order.id}, customer, false, address);
    } catch (e) {
      console.error(e)
      expect(e).be.undefined;
    }
  });

  describe("check Customer", function () {
    // let order: Order;
    // it('init', async function(){
    //     order = await Order.create({});
    // });

    it("good customer", async function () {
      await sleep(500)
      order = await Order.create({id: "check-customer"}).fetch();
      await Order.addDish({id: order.id}, dishes[0], 1, [], "", "user");
      order = await Order.findOne({id: order.id});

      try {
        await Order.check({id: order.id}, customer, true);
      } catch (e) {
        expect(e).be.undefined;
      }
    });

    it("bad customer", async function () {

      // @ts-ignore
      let badCustomer: Customer = {
        name: "Bad Man",
      };

      let error = null;
      try {
        await Order.check({id: order.id}, badCustomer);
      } catch (e) {
        error = e;
      }
      // expect(error).to.be.an('object');
      expect(error.code).to.equal(2);
      expect(error.error).to.be.an("string");

      // @ts-ignore
      badCustomer = {
        phone: {
          code: "+7",
          number: "9998882244"
        }
      };

      error = null;
      try {
        await Order.check({id: order.id}, badCustomer);
      } catch (e) {
        error = e;
      }
      expect(error.code).to.equal(1);
      expect(error.error).to.be.an("string");
    });

    it("no customer throw", async function () {
      await Order.update({ id: order.id }, {customer: null}).fetch();
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
      await sleep(500)
      order = await Order.create({id:"check-address"}).fetch();

      await Order.addDish({id: order.id}, dishes[0], 1, [], "", "user");
      order = await Order.findOne({id: order.id});

      let address: Address = {
        streetId: "1234abcd",
        city: "New York",
        street: "Green Road",
        home: "42",
        comment: "test",
      };

      try {
        await Order.check({id: order.id}, customer, null, address);
      } catch (e) {
        expect(e).be.undefined;
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
        await Order.check({id: order.id}, null, null, badAddress);
      } catch (e) {
        expect(e.code).to.equal(5);
        expect(e.error).to.be.an("string");
      }
    });

    it("no address throw", async function () {
      await Order.update({ id: order.id }, {address: null}).fetch();
      try {
        await Order.check({id: order.id}, null, true);
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
