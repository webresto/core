import path = require("path");
import { TestRMS } from "../../mocks/adapter/RMS";
import { Adapter } from "../../../adapters"; 
import { expect } from "chai";
import { address, customer } from "../../mocks/customer";


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
    await Settings.set("DELIVERY_COST", deliveryCost)
    await Order.check({id: order.id}, customer, false, address);
    order = await Order.findOne(order.id)
    expect(order.deliveryCost).to.equal(2.75);
    expect(order.deliveryItem).to.equal(null);
    

    // check self service 
    await Order.check({id: order.id}, customer, true);
    order = await Order.findOne(order.id)
    expect(order.deliveryDescription).to.equal('');
    expect(order.deliveryCost).to.equal(0);
    expect(order.deliveryItem).to.equal(null);
    

    // Delviery item
    const deliveryItem = dishes[2]
    await Settings.set("DELIVERY_ITEM", deliveryItem.id);
    await Order.check({id: order.id}, customer, false, address);
    order = await Order.findOne(order.id)
    expect(order.deliveryCost).to.equal(deliveryItem.price);
    expect(order.deliveryItem).to.equal(deliveryItem.id);
    
    // Delivery message
    const deliveryMessage = "Test123 123 %%%"
    await Settings.set("DELIVERY_MESSAGE", deliveryMessage)
    await Order.check({id: order.id}, customer, false, address);
    order = await Order.findOne(order.id)
    expect(order.deliveryDescription).to.equal(deliveryMessage);
    
    
    const freeDeliveryFrom = 333
    await Settings.set("FREE_DELIVERY_FROM", freeDeliveryFrom)
    await Order.addDish({id: order.id}, dishes[3], Math.ceil(freeDeliveryFrom/dishes[3].price), [], "", "user");
    await Order.check({id: order.id}, customer, false, address);
    order = await Order.findOne(order.id)
    expect(order.deliveryDescription).to.equal('');
    expect(order.deliveryCost).to.equal(0);
    expect(order.deliveryItem).to.equal(null);    

  });
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
