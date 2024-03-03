"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const ExternalTestPaymentSystem_1 = __importDefault(require("../../unit/external_payments/ExternalTestPaymentSystem"));
const decimal_js_1 = __importDefault(require("decimal.js"));
const customer_1 = require("../../mocks/customer");
describe("Order", function () {
    this.timeout(60000);
    let order;
    let dishes;
    let fullOrder;
    // describe('New Example', function (){
    //   it('new it', function(){
    //     return true;
    //   });
    // });
    before;
    before(async function () {
        dishes = await Dish.find({});
        order = await Order.create({ id: "create-cart" }).fetch();
    });
    it("check model fields", async function () {
        await Order.addDish({ id: order.id }, dishes[0], 1, [], "", "user");
        order = await Order.findOne(order.id).populate("dishes");
        (0, chai_1.expect)(order).to.include.all.keys("id", "shortId", "state", "dishes", "paymentMethod", "paymentMethodTitle", "paid", "isPaymentPromise", "dishesCount", "uniqueDishes", "modifiers", "customer", "address", "comment", "personsCount", "date", "problem", "rmsDelivered", "rmsId", "rmsOrderNumber", "rmsOrderData", "rmsDeliveryDate", "rmsErrorMessage", "rmsErrorCode", "rmsStatusCode", "deliveryStatus", "selfService", "deliveryDescription", "message", "deliveryItem", "deliveryCost", "totalWeight", "total", "trifleFrom", "orderTotal", "orderTotal", "discountTotal", "orderDate", "customData", "concept");
    });
    it("addDish", async function () {
        order = await Order.create({ id: "add-dish" }).fetch();
        await Order.addDish({ id: order.id }, dishes[0], 1, [], "", "user");
        await Order.addDish({ id: order.id }, dishes[1], 5, [], "test comment", "user");
        // /    await Order.addDish({id: order.id}, dishes[1], 5, [], "", "user");
        //await Order.addDish({id: order.id}, dishes[1], 5, [], "test comment", "user");s
        let result = await Order.findOne(order.id).populate("dishes");
        (0, chai_1.expect)(result.dishes.length).to.equal(2);
        let orderDish = await OrderDish.find({
            order: order.id,
            dish: dishes[0].id,
        }).sort("createdAt ASC");
        (0, chai_1.expect)(orderDish[0].amount).to.equal(1);
        (0, chai_1.expect)(orderDish[0].comment).to.equal("");
        (0, chai_1.expect)(orderDish[0].addedBy).to.equal("user");
        orderDish = await OrderDish.find({ order: order.id, dish: dishes[1].id }).sort("createdAt ASC");
        (0, chai_1.expect)(orderDish[0].amount).to.equal(5);
        (0, chai_1.expect)(orderDish[0].comment).to.equal("test comment");
        (0, chai_1.expect)(orderDish[0].addedBy).to.equal("user");
    });
    it("addDish SEPARATE_CONCEPTS_ORDERS test", async function () {
        // TODO: test it
    });
    it("addDish ONLY_CONCEPTS_DISHES test", async function () {
        // TODO: test it
    });
    it("removeDish", async function () {
        let dish = (await Order.findOne(order.id).populate("dishes")).dishes[1];
        dish = await OrderDish.findOne(dish.id);
        await Order.removeDish({ id: order.id }, dish, 1, false);
        let changedDish = await OrderDish.findOne(dish.id);
        (0, chai_1.expect)(changedDish.amount).to.equal(dish.amount - 1);
    });
    it("addDish same dish increase amount", async function () {
        order = await Order.create({ id: "adddish-same-dish-increase-amount-1" }).fetch();
        await Order.addDish({ id: order.id }, dishes[0], 2, [], "", "user");
        await Order.addDish({ id: order.id }, dishes[0], 3, [], "", "user");
        await Order.addDish({ id: order.id }, dishes[0], 1, null, "", "user");
        let orderDishes = await OrderDish.find({ order: order.id, dish: dishes[0].id });
        (0, chai_1.expect)(orderDishes.length).to.equals(1);
        (0, chai_1.expect)(orderDishes[0].amount).to.equals(6);
        order = await Order.create({ id: "adddish-same-dish-increase-amount-2" }).fetch();
        await Order.addDish({ id: order.id }, dishes[0], 1, [{ id: dishes[1].id, modifierId: dishes[1].id }], "", "user");
        await Order.addDish({ id: order.id }, dishes[0], 1, null, "", "user");
        await Order.addDish({ id: order.id }, dishes[0], 2, null, "", "user");
        orderDishes = await OrderDish.find({ order: order.id, dish: dishes[0].id });
        // here we test what uniq dishes is any with modifiers
        (0, chai_1.expect)(orderDishes.length).to.equals(2);
        for (let dish of orderDishes) {
            if (dish.modifiers.length == 1) {
                (0, chai_1.expect)(dish.amount).to.equals(1);
            }
            else {
                (0, chai_1.expect)(dish.amount).to.equals(3);
            }
        }
    });
    // it('setCount', async function(){
    //   let dish = (await Order.findOne({id: order.id}).populate('dishes')).dishes[0];
    //   dish = await OrderDish.findOne(dish.id);
    //   await order.setCount(dish, 10);
    //   let changedDish = await OrderDish.findOne({id: dish.id});
    //   expect(changedDish.amount).to.equal(10);
    // });
    it("setModifierCount?", async function () {
        //TODO do nothing
    });
    it("setComment", async function () {
        let dish = (await Order.findOne({ id: order.id }).populate("dishes")).dishes[0];
        dish = await OrderDish.findOne({ id: dish.id });
        let testComment = "this is a test comment";
        await Order.setComment({ id: order.id }, dish, testComment);
        let changedDish = await OrderDish.findOne({ id: dish.id });
        (0, chai_1.expect)(changedDish.comment).to.equal(testComment);
    });
    it("addDish 20", async function () {
        order = await Order.create({ id: "adddish-20" }).fetch();
        for (let i = 0; i < 20; i++) {
            await Order.addDish({ id: order.id }, dishes[i], 3, [], "", "user");
        }
    });
    it("addDish 21th", async function () {
        await Order.addDish({ id: order.id }, dishes[21], 3, [], "", "user");
    });
    it("setSelfService", async function () {
        let order = await Order.create({ id: "setselfservice" }).fetch();
        order = await Order.setSelfService({ id: order.id }, true);
        (0, chai_1.expect)(order.selfService).to.equal(true);
        order = await Order.setSelfService({ id: order.id }, false);
        (0, chai_1.expect)(order.selfService).to.equal(false);
    });
    it("countCart", async function () {
        let order = await Order.create({ id: "test--countcart" }).fetch();
        await Order.updateOne({ id: order.id }, { concept: "origin", user: "user" });
        await Order.addDish({ id: order.id }, dishes[0], 5, [], "", "user");
        await Order.addDish({ id: order.id }, dishes[1], 3, [], "", "user");
        await Order.addDish({ id: order.id }, dishes[2], 8, [], "", "user");
        // Add dish with modifier with zero price
        // TODO: zero price modier test
        //await Order.addDish({id: order.id}, dishes[5], 1, [{ id: "modifier-with-zero-price", modifierId: "modifier-with-zero-price" }], "", "user");
        // // Modifier with price
        await Order.addDish({ id: order.id }, dishes[5], 1, [{ id: dishes[6].id, modifierId: dishes[6].id }], "", "user");
        let changedOrder = await Order.countCart({ id: order.id });
        // console.dir(changedOrder)
        (0, chai_1.expect)(changedOrder.uniqueDishes).to.equal(4);
        (0, chai_1.expect)(changedOrder.dishesCount).to.equal(5 + 3 + 8 + 1); // 18
        (0, chai_1.expect)(changedOrder.totalWeight).to.equal(new decimal_js_1.default(100).times(changedOrder.dishesCount).plus(100).toNumber());
        (0, chai_1.expect)(changedOrder.basketTotal).to.equal(new decimal_js_1.default(100.1).times(changedOrder.dishesCount).plus(100.1).toNumber());
        // expect(changedOrder.totalWeight).to.equal(changedOrder.dishesCount * 100 + (100 + 100 /** from mofifiers */)); 
        // expect(changedOrder.orderTotal).to.equal(changedOrder.dishesCount * 100.1 + ( 100.1  + 0 /** from mofifiers */));
    });
    it("order", async function () {
        let count1 = 0;
        let count2 = 0;
        let count3 = 0;
        let count4 = 0;
        emitter.on("core-order-before-order", "test", function () {
            count1++;
        });
        emitter.on("core-order-order-self-service", "test", function () {
            count2++;
        });
        emitter.on("core-order-order", "test", function () {
            count3++;
        });
        emitter.on('core-order-after-order', "test", function () {
            count4++;
        });
        await Order.setSelfService({ id: order.id }, true);
        await Order.check({ id: order.id }, customer_1.customer, true, undefined, undefined);
        await Order.order({ id: order.id });
        (0, chai_1.expect)(count1).to.equal(1);
        (0, chai_1.expect)(count2).to.equal(1);
        (0, chai_1.expect)(count3).to.equal(1);
        // expect(count4).to.equal(1);
        let error = null;
        try {
            await Order.order({ id: order.id });
        }
        catch (e) {
            error = e;
        }
        (0, chai_1.expect)(error).to.not.equal(null);
        emitter.on("core-order-order-delivery", "test", function () {
            // count1++;
        });
    });
    it("paymentMethodId", async function () {
        let order = await Order.create({ id: "paymentmethodid" }).fetch();
        let testPaymentSystem = await ExternalTestPaymentSystem_1.default.getInstance();
        let paymentSystem = (await PaymentMethod.find())[0];
        await Order.update({ id: order.id }, { paymentMethod: paymentSystem.id }).fetch();
        let result = await Order.paymentMethodId({ id: order.id });
        (0, chai_1.expect)(result).to.equal(paymentSystem.id);
    });
    it("doPaid", async function () {
        (0, chai_1.expect)(Order.doPaid).to.not.equals(undefined);
        let order = await Order.create({ id: "dopaid" }).fetch();
        await Order.addDish({ id: order.id }, dishes[0], 5, [], "", "user");
        await Order.addDish({ id: order.id }, dishes[1], 3, [], "", "user");
        await Order.addDish({ id: order.id }, dishes[2], 8, [], "", "user");
        await Order.check({ id: order.id }, customer_1.customer, true, undefined, undefined);
        const paymentMethod = (await PaymentMethod.find({}))[0];
        let newPaymentDocument = {
            originModelId: order.id,
            externalId: "string",
            originModel: "string",
            paymentMethod: paymentMethod.id,
            amount: 1000,
            comment: "string",
            redirectLink: "string",
        };
        var paymentDocument = await PaymentDocument.create(newPaymentDocument).fetch();
        await Order.doPaid({ id: order.id }, paymentDocument);
        order = await Order.findOne(order.id);
        (0, chai_1.expect)(order.paid).to.equals(true);
        (0, chai_1.expect)(order.paymentMethod).to.equals(paymentDocument.paymentMethod);
        let paymentMethodTitle = (await PaymentMethod.findOne(paymentDocument.paymentMethod)).title;
        (0, chai_1.expect)(order.paymentMethodTitle).to.equals(paymentMethodTitle);
    });
});
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
