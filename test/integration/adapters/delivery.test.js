"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const customer_1 = require("../../mocks/customer");
describe("RMS adapter", function () {
    this.timeout(60000);
    before(async function () {
    });
    it("Delivery adapter order flow integration", async () => {
        // If item is added, then see that it stood in line.
        // Pass the test response of Messaja
        // if the Cost is added, he set
        // if item is borrowed from him
        var dishes = await Dish.find({});
        let order = await Order.create({ id: "test-delivery-adpter" }).fetch();
        await Order.addDish({ id: order.id }, dishes[0], 1, [], "", "user");
        order = await Order.findOne({ id: order.id });
        await Order.check({ id: order.id }, customer_1.customer, false, customer_1.address);
        order = await Order.findOne(order.id);
        (0, chai_1.expect)(order.deliveryCost).to.equal(0);
        (0, chai_1.expect)(order.deliveryItem).to.equal(null);
        // Flat delivery cost
        const deliveryCost = 2.75;
        await Settings.set("DELIVERY_COST", deliveryCost);
        await Order.check({ id: order.id }, customer_1.customer, false, customer_1.address);
        order = await Order.findOne(order.id);
        (0, chai_1.expect)(order.deliveryCost).to.equal(2.75);
        (0, chai_1.expect)(order.deliveryItem).to.equal(null);
        // check self service 
        await Order.check({ id: order.id }, customer_1.customer, true);
        order = await Order.findOne(order.id);
        (0, chai_1.expect)(order.delivery).to.equal(null);
        (0, chai_1.expect)(order.deliveryDescription).to.equal('');
        (0, chai_1.expect)(order.deliveryCost).to.equal(0);
        (0, chai_1.expect)(order.deliveryItem).to.equal(null);
        // Delviery item
        const deliveryItem = dishes[2];
        await Settings.set("DELIVERY_ITEM", deliveryItem.id);
        await Order.check({ id: order.id }, customer_1.customer, false, customer_1.address);
        order = await Order.findOne(order.id);
        (0, chai_1.expect)(order.delivery.allowed).to.equal(true);
        (0, chai_1.expect)(order.deliveryCost).to.equal(deliveryItem.price);
        (0, chai_1.expect)(order.deliveryItem).to.equal(deliveryItem.id);
        // Delivery message
        const deliveryMessage = "Test123 123 %%%";
        await Settings.set("DELIVERY_MESSAGE", deliveryMessage);
        await Order.check({ id: order.id }, customer_1.customer, false, customer_1.address);
        order = await Order.findOne(order.id);
        (0, chai_1.expect)(order.delivery.allowed).to.equal(true);
        (0, chai_1.expect)(order.deliveryDescription).to.equal(deliveryMessage);
        const freeDeliveryFrom = 333;
        await Settings.set("FREE_DELIVERY_FROM", freeDeliveryFrom);
        await Order.addDish({ id: order.id }, dishes[3], Math.ceil(freeDeliveryFrom / dishes[3].price), [], "", "user");
        await Order.check({ id: order.id }, customer_1.customer, false, customer_1.address);
        order = await Order.findOne(order.id);
        (0, chai_1.expect)(order.delivery.allowed).to.equal(true);
        (0, chai_1.expect)(order.deliveryDescription).to.equal('');
        (0, chai_1.expect)(order.deliveryCost).to.equal(0);
        (0, chai_1.expect)(order.deliveryItem).to.equal(null);
        order = await Order.findOne(order.id);
        const minDeliveryAmount = order.basketTotal + 100;
        await Settings.set("MIN_DELIVERY_AMOUNT", minDeliveryAmount);
        let error = null;
        try {
            await Order.check({ id: order.id }, customer_1.customer, false, customer_1.address);
        }
        catch (_error) {
            error = _error;
        }
        order = await Order.findOne(order.id);
        (0, chai_1.expect)(error).to.not.equal(null);
        (0, chai_1.expect)(order.delivery.allowed).to.equal(false);
        await Settings.set("MIN_DELIVERY_AMOUNT", 0);
    });
});
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
