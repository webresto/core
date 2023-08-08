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
    

    const deliveryCost = 2.75;
    await Settings.set("DELIVERY_COST", deliveryCost)
    
    
    const deliveryItem = dishes[0].id
    await Settings.get("DELIVERY_ITEM", deliveryItem);
    
    const deliveryMessage = "Test123 123 %%%"
    await Settings.set("DELIVERY_MESSAGE", deliveryMessage)

    
    const freeDeliveryFrom = 200
    await Settings.set("FREE_DELIVERY_FROM", freeDeliveryFrom)


    // 
    await Order.check({id: order.id}, customer, false, address);
  
    // check clean 
    await Order.check({id: order.id}, customer, true);


  });

});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
