"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const Order_1 = __importDefault(require("../../../models/Order"));
const Settings_1 = __importDefault(require("../../../models/Settings"));
const customer_1 = require("../../mocks/customer");
describe("Flows: Checkout", function () {
    this.timeout(10000);
    var order;
    let dishes;
    it("Check dishescount", async function () {
        await sleep(500);
        order = await Order_1.default.create({ id: "test.order.check-dishescount" }).fetch();
        dishes = await Dish.find({});
        await Order_1.default.addDish({ id: order.id }, dishes[0], 1, [], "", "user");
        order = await Order_1.default.findOne({ id: "test.order.check-dishescount" });
        if (!order)
            throw "Order not created";
        if (order.dishesCount !== 1)
            throw `Order dishescount: ${order.dishesCount} ${JSON.stringify(order)}`;
    });
    it("Check paymentSystem", async function () {
        try {
            let paymentSystem = (await PaymentMethod.find().limit(1))[0];
            await Order_1.default.check({ id: order.id }, customer_1.customer, false, customer_1.address, paymentSystem.id);
            await Order_1.default.check({ id: order.id }, null, null, null, paymentSystem.id);
            try {
                await Order_1.default.check({ id: order.id }, null, null, null, "bad-id-payment-system");
            }
            catch (e) {
                (0, chai_1.expect)(e.code).to.equal(8);
                (0, chai_1.expect)(e.error).to.be.an("string");
            }
        }
        catch (error) {
            throw error;
        }
    });
    it("awaitEmitter order events", async function () {
        //@ts-ignore
        await Settings_1.default.set("CHECKOUT_STRATEGY", { key: "CHECKOUT_STRATEGY", value: { notRequired: true }, jsonSchema: {
                type: "object",
                properties: {
                    notRequired: {
                        type: "boolean"
                    }
                }
            } });
        let core_order_before_check = 0;
        let core_order_check_delivery = 0;
        let core_order_check = 0;
        let core_order_after_check = 0;
        emitter.on("core:order-before-check", "test", function () {
            core_order_before_check = 1;
        });
        emitter.on("core:order-check-delivery", "test", function () {
            core_order_check_delivery = 1;
        });
        emitter.on("core:order-check", "test", function () {
            core_order_check = 1;
        });
        emitter.on("core:order-after-check-counting", "test", function () {
            core_order_after_check = 1;
        });
        try {
            await Order_1.default.check({ id: order.id }, customer_1.customer);
        }
        catch (e) {
            console.error(e);
        }
        (0, chai_1.expect)(core_order_before_check).to.equal(1);
        (0, chai_1.expect)(core_order_check_delivery).to.equal(1);
        (0, chai_1.expect)(core_order_check).to.equal(1);
        (0, chai_1.expect)(core_order_after_check).to.equal(1);
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
            await Order_1.default.check({ id: order.id }, customer_1.customer, true, customer_1.address);
        }
        catch (e) {
            console.error(e);
        }
        (0, chai_1.expect)(core_order_is_self_service).to.equal(1);
        (0, chai_1.expect)(emitCustomer).to.equal(customer_1.customer);
        (0, chai_1.expect)(emitSelfService).to.equal(true);
        (0, chai_1.expect)(emitAddress).to.equal(customer_1.address);
    });
    it("throw if order is Paid (next Only ORDER)", async function () {
        await Order_1.default.update({ id: order.id }, { state: "PAYMENT", paid: true }).fetch();
        try {
            await Order_1.default.check({ id: order.id }, customer_1.customer);
        }
        catch (e) {
            (0, chai_1.expect)(e).be.not.undefined;
        }
    });
    it("throw if state ORDER", async function () {
        await Order_1.default.next(order.id, "ORDER");
        try {
            await Order_1.default.check({ id: order.id }, customer_1.customer);
        }
        catch (e) {
            (0, chai_1.expect)(e).be.not.undefined;
        }
    });
    it("test checkConfig (default - requireAll)", async function () {
        emitter.on("core:order-check", "test checkConfig (default - requireAll)", function () {
            throw "test";
        });
        await sleep(500);
        order = await Order_1.default.create({ id: "test-checkconfig-default-requireall" }).fetch();
        await Order_1.default.addDish({ id: order.id }, dishes[0], 1, [], "", "user");
        order = await Order_1.default.findOne({ id: order.id });
        await Settings_1.default.set("CHECKOUT_STRATEGY", { key: "CHECKOUT_STRATEGY", value: {}, jsonSchema: { "type": "object" } });
        try {
            await Order_1.default.check({ id: order.id }, customer_1.customer, true);
        }
        catch (e) {
            (0, chai_1.expect)(e.code).to.equal(0);
        }
        // just user with address
        try {
            await Order_1.default.check({ id: order.id }, customer_1.customer, false, customer_1.address);
        }
        catch (e) {
            console.error(e);
            (0, chai_1.expect)(e.code).to.equal(0);
        }
    });
    it("test checkConfig (notRequired)", async function () {
        await Settings_1.default.set("CHECKOUT_STRATEGY", { key: "CHECKOUT_STRATEGY", value: { notRequired: true }, jsonSchema: {
                type: "object",
                properties: {
                    notRequired: {
                        type: "boolean"
                    }
                }
            } });
        await sleep(500);
        order = await Order_1.default.create({ id: "test-checkconfig-notrequired" }).fetch();
        await Order_1.default.addDish({ id: order.id }, dishes[0], 1, [], "", "user");
        order = await Order_1.default.findOne({ id: order.id });
        // for selfServices
        try {
            await Order_1.default.check({ id: order.id }, customer_1.customer, true);
        }
        catch (e) {
            (0, chai_1.expect)(e).be.undefined;
        }
        // just user with address
        try {
            await Order_1.default.check({ id: order.id }, customer_1.customer, false, customer_1.address);
        }
        catch (e) {
            console.error(e);
            (0, chai_1.expect)(e).be.undefined;
        }
    });
    describe("check Customer", function () {
        // let order: Order;
        // it('init', async function(){
        //     order = await Order.create({});
        // });
        it("good customer", async function () {
            await sleep(500);
            order = await Order_1.default.create({ id: "check-customer" }).fetch();
            await Order_1.default.addDish({ id: order.id }, dishes[0], 1, [], "", "user");
            order = await Order_1.default.findOne({ id: order.id });
            try {
                await Order_1.default.check({ id: order.id }, customer_1.customer, true);
            }
            catch (e) {
                (0, chai_1.expect)(e).be.undefined;
            }
        });
        it("bad customer", async function () {
            // @ts-ignore
            let badCustomer = {
                name: "Bad Man",
            };
            let error = null;
            try {
                await Order_1.default.check({ id: order.id }, badCustomer);
            }
            catch (e) {
                error = e;
            }
            // expect(error).to.be.an('object');
            (0, chai_1.expect)(error.code).to.equal(2);
            (0, chai_1.expect)(error.error).to.be.an("string");
            // @ts-ignore
            badCustomer = {
                phone: {
                    code: "+7",
                    number: "9998882244"
                }
            };
            error = null;
            try {
                await Order_1.default.check({ id: order.id }, badCustomer);
            }
            catch (e) {
                error = e;
            }
            (0, chai_1.expect)(error.code).to.equal(1);
            (0, chai_1.expect)(error.error).to.be.an("string");
        });
        it("no customer throw", async function () {
            await Order_1.default.update({ id: order.id }, { customer: null }).fetch();
            let error = null;
            try {
                await Order_1.default.check({ id: order.id });
            }
            catch (e) {
                error = e;
            }
            (0, chai_1.expect)(error.code).to.equal(2);
            (0, chai_1.expect)(error.error).to.be.an("string");
        });
    });
    describe("check Address", function () {
        it("good address", async function () {
            await sleep(500);
            order = await Order_1.default.create({ id: "check-address" }).fetch();
            await Order_1.default.addDish({ id: order.id }, dishes[0], 1, [], "", "user");
            order = await Order_1.default.findOne({ id: order.id });
            let address = {
                streetId: "1234abcd",
                city: "New York",
                street: "Green Road",
                home: "42",
                comment: "test",
            };
            try {
                await Order_1.default.check({ id: order.id }, customer_1.customer, null, address);
            }
            catch (e) {
                (0, chai_1.expect)(e).be.undefined;
            }
        });
        it("bad address", async function () {
            // @ts-ignore
            let badAddress = {
                city: "New York",
                // street: 'Green Road',
                home: "42",
                comment: "test",
            };
            try {
                await Order_1.default.check({ id: order.id }, null, null, badAddress);
            }
            catch (e) {
                (0, chai_1.expect)(e.code).to.equal(5);
                (0, chai_1.expect)(e.error).to.be.an("string");
            }
        });
        it("no address throw", async function () {
            await Order_1.default.update({ id: order.id }, { address: null }).fetch();
            try {
                await Order_1.default.check({ id: order.id }, null, true);
            }
            catch (e) {
                (0, chai_1.expect)(e.code).to.equal(2);
                (0, chai_1.expect)(e.error).to.be.an("string");
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
