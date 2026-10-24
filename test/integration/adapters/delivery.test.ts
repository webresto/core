/// <reference path="./../../../index.ts" />
import path = require("path");
import { TestRMS } from "../../mocks/adapter/RMS";
import { Adapter } from "../../../adapters";
import { expect } from "chai";
import { address, customer } from "../../mocks/customer";
import dishGenerator from "../../generators/dish.generator";


describe("RMS adapter", function () {
  this.timeout(60000)

  before(async function() {

  });
  it("Delivery adapter order flow integration", async () => {
    // If item is added, then see that it stood in line.
    // Pass the test response of Messaja
    // if the Cost is added, he set
    // if item is borrowed from him

    var dishes = await Dish.find({})

    let order = await Order.create({id: "test-delivery-adpter"}).fetch();
    await Order.addDish({id: order.id}, dishes[0], 1, [], "", "user");
    order = await Order.findOne({id: order.id});


    await Order.check({id: order.id}, customer, false, address);
    order = await Order.findOne(order.id)
    expect(order.deliveryCost).to.equal(0);
    expect(order.deliveryItem).to.equal(null);

    // Flat delivery cost
    const deliveryCost = 2.75;
    await Settings.set("DELIVERY_COST", {key: "DELIVERY_COST", value: deliveryCost});
    await Order.check({id: order.id}, customer, false, address);
    order = await Order.findOne(order.id)
    expect(order.deliveryCost).to.equal(2.75);
    expect(order.deliveryItem).to.equal(null);


    // check self service
    await Order.check({id: order.id}, customer, true);
    order = await Order.findOne(order.id)

    expect(order.delivery).to.equal(null);
    expect(order.deliveryDescription).to.equal('');
    expect(order.deliveryCost).to.equal(0);
    expect(order.deliveryItem).to.equal(null);


    // Delivery item
    const deliveryItem = dishes[2]
    await Settings.set("DELIVERY_ITEM", {key: "DELIVERY_ITEM", value: deliveryItem.id});
    await Order.check({id: order.id}, customer, false, address);
    order = await Order.findOne(order.id)
    expect(order.delivery.allowed).to.equal(true);
    expect(order.deliveryCost).to.equal(deliveryItem.price);
    expect(order.deliveryItem).to.equal(deliveryItem.id);

    // Delivery message
    const deliveryMessage = "Test123 123 %%%"
    await Settings.set("DELIVERY_MESSAGE", {key: "DELIVERY_MESSAGE", value: deliveryMessage});
    await Order.check({id: order.id}, customer, false, address);
    order = await Order.findOne(order.id)
    expect(order.delivery.allowed).to.equal(true);
    expect(order.deliveryDescription).to.equal(deliveryMessage);


    const freeDeliveryFrom = 333
    await Settings.set("FREE_DELIVERY_FROM", {key: "FREE_DELIVERY_FROM", value: freeDeliveryFrom});
    await Order.addDish({id: order.id}, dishes[3], Math.ceil(freeDeliveryFrom/dishes[3].price), [], "", "user");
    await Order.check({id: order.id}, customer, false, address);
    order = await Order.findOne(order.id)

    expect(order.delivery.allowed).to.equal(true);
    expect(order.deliveryDescription).to.equal('');
    expect(order.deliveryCost).to.equal(0);
    expect(order.deliveryItem).to.equal(null);


    order = await Order.findOne(order.id)
    const minDeliveryAmount = order.basketTotal + 100;
    await Settings.set("MIN_DELIVERY_AMOUNT", {key: "MIN_DELIVERY_AMOUNT", value: minDeliveryAmount});

    await Order.check({id: order.id}, customer, false, address);
    order = await Order.findOne(order.id)
    expect(order.total > minDeliveryAmount).to.equal(false);
    expect(order.delivery.message).to.equal(`Minimum amount not allowed`);
    await Settings.set("MIN_DELIVERY_AMOUNT", {key: "MIN_DELIVERY_AMOUNT", value: 0});
  });

  it("FREE_DELIVERY_FROM: 0 means no threshold, the threshold sum itself is free", async () => {
    const dish = await Dish.createOrUpdate(dishGenerator({ name: "free delivery threshold dish", price: 100, concept: undefined }));
    await Settings.set("DELIVERY_ITEM", {key: "DELIVERY_ITEM", value: ""});
    await Settings.set("DELIVERY_MESSAGE", {key: "DELIVERY_MESSAGE", value: ""});
    await Settings.set("DELIVERY_COST", {key: "DELIVERY_COST", value: 50});

    let order = await Order.create({id: "test-free-delivery-from"}).fetch();
    await Order.addDish({id: order.id}, dish, 3, [], "", "user");

    // 0 (the default) used to make every non-empty basket free
    await Settings.set("FREE_DELIVERY_FROM", {key: "FREE_DELIVERY_FROM", value: 0});
    await Order.check({id: order.id}, customer, false, address);
    order = await Order.findOne(order.id);
    expect(order.deliveryCost).to.equal(50);

    // basket 300 is below 301
    await Settings.set("FREE_DELIVERY_FROM", {key: "FREE_DELIVERY_FROM", value: 301});
    await Order.check({id: order.id}, customer, false, address);
    order = await Order.findOne(order.id);
    expect(order.deliveryCost).to.equal(50);

    // basket 300 is exactly the threshold
    await Settings.set("FREE_DELIVERY_FROM", {key: "FREE_DELIVERY_FROM", value: 300});
    await Order.check({id: order.id}, customer, false, address);
    order = await Order.findOne(order.id);
    expect(order.deliveryCost).to.equal(0);
    expect(order.delivery.allowed).to.equal(true);
    expect(order.total).to.equal(300);

    await Settings.set("FREE_DELIVERY_FROM", {key: "FREE_DELIVERY_FROM", value: 0});
    await Settings.set("DELIVERY_COST", {key: "DELIVERY_COST", value: 0});
  });
  it("cart address without a city: countCart takes CITY and calculates the delivery in the cart", async () => {
    const dish = await Dish.createOrUpdate(dishGenerator({ name: "cart delivery city dish", price: 100, concept: undefined }));
    await Settings.set("CITY", {key: "CITY", value: "Test City"});
    await Settings.set("DELIVERY_COST", {key: "DELIVERY_COST", value: 50});
    await Settings.set("MIN_DELIVERY_AMOUNT", {key: "MIN_DELIVERY_AMOUNT", value: 500});

    let order = await Order.create({id: "test-cart-delivery-city"}).fetch();
    await Order.addDish({id: order.id}, dish, 3, [], "", "user");
    // the storefront sets the address in the cart (orderUpdate) without a city and without Order.check
    await Order.updateOne({id: order.id}).set({selfService: false, address: {street: "Courtlandt Ave", home: "681", city: null}});
    await Order.countCart({id: order.id});
    order = await Order.findOne(order.id);
    expect(order.state).to.equal("CART");
    expect(order.address.city).to.equal("Test City");
    expect(order.delivery.allowed).to.equal(false);
    expect(order.delivery.message).to.equal("Minimum amount not allowed");

    // above the minimum: the cart gets the delivery cost
    await Settings.set("MIN_DELIVERY_AMOUNT", {key: "MIN_DELIVERY_AMOUNT", value: 0});
    await Order.countCart({id: order.id});
    order = await Order.findOne(order.id);
    expect(order.delivery.allowed).to.equal(true);
    expect(order.deliveryCost).to.equal(50);

    await Settings.set("DELIVERY_COST", {key: "DELIVERY_COST", value: 0});
  });
});
