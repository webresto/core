import { expect } from "chai";
import Address from "../../../interfaces/Address";
import { name } from "faker";
import Order from "../../../models/Order";
import Dish from "../../../models/Dish";
import Customer from "../../../interfaces/Customer";
import { Payment } from "../../../interfaces/Payment";
import TestPaymentSystem from "../../unit/external_payments/ExternalTestPaymentSystem";
import PaymentDocument from "../../../models/PaymentDocument";
import OrderDish from "../../../models/OrderDish";
import Decimal from "decimal.js";
import { customer, address } from "../../mocks/customer"

describe("Order", function () {

  this.timeout(10000);
  let order: Order;
  let dishes: Dish[];
  let fullOrder: Order;

  // describe('New Example', function (){
  //   it('new it', function(){
  //     return true;
  //   });
  // });

  it("get dishes", async function () {
    dishes = await Dish.find({});
  });

  it("create Сart", async function () {
    order = await Order.create({id:"create-cart"}).fetch();
    expect(order).to.be.an("object");
  });

  it("check model fields", async function () {
    await Order.addDish({id: order.id}, dishes[0], 1, [], "", "test");
    order = await Order.findOne(order.id).populate("dishes");
    expect(order).to.include.all.keys(
      "id",
      "shortId",
      "state",
      "dishes",
      "paymentMethod",
      "paymentMethodTitle",
      "paid",
      "isPaymentPromise",
      "dishesCount",
      "uniqueDishes",
      "modifiers",
      "customer",
      "address",
      "comment",
      "personsCount",
      "date",
      "problem",
      "rmsDelivered",
      "rmsId",
      "rmsOrderNumber",
      "rmsOrderData",
      "rmsDeliveryDate",
      "rmsErrorMessage",
      "rmsErrorCode",
      "rmsStatusCode",
      "deliveryStatus",
      "selfService",
      "deliveryDescription",
      "message",
      "deliveryItem",
      "deliveryCost",
      "totalWeight",
      "total",
      "trifleFrom",
      "orderTotal",
      "orderTotal",
      "discountTotal",
      "orderDate",
      "customData",
      "concept"
    );
  });

  it("addDish", async function () {
    order = await Order.create({id: "add-dish"}).fetch();

    await Order.addDish({id: order.id}, dishes[0], 1, [], "", "test");
    await Order.addDish({id: order.id}, dishes[1], 5, [], "test comment", "test");

// /    await Order.addDish({id: order.id}, dishes[1], 5, [], "", "test");
    //await Order.addDish({id: order.id}, dishes[1], 5, [], "test comment", "test");s
    let result = await Order.findOne(order.id).populate("dishes");

    expect(result.dishes.length).to.equal(2);

    let orderDish = await OrderDish.find({
      order: order.id,
      dish: dishes[0].id,
    }).sort("createdAt ASC");

    expect(orderDish[0].amount).to.equal(1);
    expect(orderDish[0].comment).to.equal("");
    expect(orderDish[0].addedBy).to.equal("test");

    orderDish = await OrderDish.find({ order: order.id, dish: dishes[1].id }).sort("createdAt ASC");
    expect(orderDish[0].amount).to.equal(5);
    expect(orderDish[0].comment).to.equal("test comment");
    expect(orderDish[0].addedBy).to.equal("test");
  });

  it("addDish SEPARATE_CONCEPTS_ORDERS test", async function () {
    // TODO: test it
  });

  it("addDish ONLY_CONCEPTS_DISHES test", async function () {
    // TODO: test it
  });

  it("removeDish", async function () {
    let dish = (await Order.findOne(order.id).populate("dishes")).dishes[1] as OrderDish;
    dish = await OrderDish.findOne(dish.id);
    await Order.removeDish({id: order.id}, dish, 1, false);
    let changedDish = await OrderDish.findOne(dish.id);

    expect(changedDish.amount).to.equal(dish.amount - 1);
  });

  it("addDish same dish increase amount", async function () {
    order = await Order.create({id: "adddish-same-dish-increase-amount-1"}).fetch();
    await Order.addDish({id: order.id}, dishes[0], 2, [], "", "test");
    await Order.addDish({id: order.id}, dishes[0], 3, [], "", "test");
    await Order.addDish({id: order.id}, dishes[0], 1, null, "", "test");

    let orderDishes = await OrderDish.find({ order: order.id, dish: dishes[0].id });
    expect(orderDishes.length).to.equals(1);
    expect(orderDishes[0].amount).to.equals(6);

    order = await Order.create({id:"adddish-same-dish-increase-amount-2"}).fetch();
    await Order.addDish({id: order.id}, dishes[0], 1, [{ id: dishes[1].id, modifierId: dishes[1].id }], "", "mod");
    await Order.addDish({id: order.id}, dishes[0], 1, null, "", "test");
    await Order.addDish({id: order.id}, dishes[0], 2, null, "", "test");
    orderDishes = await OrderDish.find({ order: order.id, dish: dishes[0].id });
    expect(orderDishes.length).to.equals(2);
    for (let dish of orderDishes) {
      if (dish.modifiers.length == 1) {
        expect(dish.amount).to.equals(1);
      } else {
        expect(dish.amount).to.equals(3);
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
    let dish = (await Order.findOne({ id: order.id }).populate("dishes")).dishes[0] as OrderDish;
    dish = await OrderDish.findOne({ id: dish.id }) ;
    let testComment = "this is a test comment";
    await Order.setComment({id: order.id}, dish, testComment);
    let changedDish = await OrderDish.findOne({ id: dish.id });

    expect(changedDish.comment).to.equal(testComment);
  });

  it("addDish 20", async function () {
    order = await Order.create({id: "adddish-20"}).fetch();
    for (let i = 0; i < 20; i++) {
      await Order.addDish({id: order.id}, dishes[i], 3, [], "", "");
    }
  });

  it("addDish 21th", async function () {
    await Order.addDish({id: order.id}, dishes[21], 3, [], "", "");
  });

  it("setSelfService", async function () {
    let order = await Order.create({id: "setselfservice"}).fetch();
    order = await Order.setSelfService({id: order.id}, true);
    expect(order.selfService).to.equal(true);
    
    order = await Order.setSelfService({id: order.id}, false);
    
    expect(order.selfService).to.equal(false);
  });


  it("countCart", async function () {
    let order = await Order.create({id: "test--countcart"}).fetch();
    await Order.updateOne({id: order.id}, {concept: "origin",user: "user"});
    
    await Order.addDish({id: order.id}, dishes[0], 5, [], "", "test");
    await Order.addDish({id: order.id}, dishes[1], 3, [], "", "test");
    await Order.addDish({id: order.id}, dishes[2], 8, [], "", "test");
    
    // Add dish with modifier with zero price
    await Order.addDish({id: order.id}, dishes[5], 1, [{ id: "modifier-with-zero-price", modifierId: "modifier-with-zero-price" }], "", "test");
    
    // // Modifier with price
    await Order.addDish({id: order.id}, dishes[5], 1, [{ id: dishes[6].id, modifierId: dishes[6].id }], "", "test");


    let changedOrder = await Order.countCart({id: order.id});
    console.dir(changedOrder)
    expect(changedOrder.uniqueDishes).to.equal(5);
    expect(changedOrder.dishesCount).to.equal(5 + 3 + 8 + 1 + 1); // 18
   
   
    expect(changedOrder.totalWeight).to.equal(new Decimal(100).times(changedOrder.dishesCount).plus(200).toNumber());
    expect(changedOrder.orderTotal).to.equal(new Decimal(100.1).times(changedOrder.dishesCount).plus(100.1).toNumber());

   
    // expect(changedOrder.totalWeight).to.equal(changedOrder.dishesCount * 100 + (100 + 100 /** from mofifiers */)); 
    // expect(changedOrder.orderTotal).to.equal(changedOrder.dishesCount * 100.1 + ( 100.1  + 0 /** from mofifiers */));
  });

  it("order", async function () {
    let count1 = 0;
    let count2 = 0;
    let count3 = 0;
    let count4 = 0;

    emitter.on("core-order-before-order", function () {
      count1++;
    });

    emitter.on("core-order-order-self-service", function () {
      count2++;
    });

    emitter.on("core-order-order", function () {
      count3++;
    });
    emitter.on('core-order-after-order', function(){
      count4++;
    });

    await Order.setSelfService({id: order.id}, true);

    await Order.check({id: order.id}, customer, true, undefined, undefined);
 
    await Order.order({id: order.id});
    
    expect(count1).to.equal(1);
    expect(count2).to.equal(1);
    expect(count3).to.equal(1);
    // expect(count4).to.equal(1);

    let error = null;
    try {
      await Order.order({id: order.id});
    } catch (e) {
      error = e;
    }
    expect(error).to.not.equal(null);

    emitter.on("core-order-order-delivery", function () {
      // count1++;
    });
  });

  it("paymentMethodId", async function () {
    let order = await Order.create({id: "paymentmethodid"}).fetch();
    let testPaymentSystem = await TestPaymentSystem.getInstance();
    let paymentSystem = (await PaymentMethod.find())[0];
    await Order.update({ id: order.id }, {paymentMethod: paymentSystem.id}).fetch();

    let result = await Order.paymentMethodId({id: order.id});
    expect(result).to.equal(paymentSystem.id);
  });

  it("doPaid", async function () {
    expect(Order.doPaid).to.not.equals(undefined);

    let order = await Order.create({id:"dopaid"}).fetch();
    await Order.addDish({id: order.id}, dishes[0], 5, [], "", "");
    await Order.addDish({id: order.id}, dishes[1], 3, [], "", "");
    await Order.addDish({id: order.id}, dishes[2], 8, [], "", "");

    await Order.check({id: order.id}, customer, true, undefined, undefined);

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
    await Order.doPaid({id: order.id}, paymentDocument);
    order = await Order.findOne(order.id);
    expect(order.paid).to.equals(true);
    expect(order.paymentMethod).to.equals(paymentDocument.paymentMethod);
    let paymentMethodTitle = (await PaymentMethod.findOne(paymentDocument.paymentMethod)).title;
    expect(order.paymentMethodTitle).to.equals(paymentMethodTitle);
  });
});


function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
