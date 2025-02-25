/// <reference path="./../../index.ts" />
import path = require("path");
import { TestRMS } from "../mocks/adapter/RMS";
import { Adapter } from "../../adapters";
import { expect } from "chai";
import { address, customer } from "../mocks/customer";
import dishGenerator from "../generators/dish.generator";
// todo: fix types model instance to {%ModelName%}Record for Dish';
import { PromotionAdapter } from "../../adapters/promotion/default/promotionAdapter";
import TestPaymentSystem from "../unit/external_payments/ExternalTestPaymentSystem";
import { DishRecord } from "../../models/Dish";



describe("111 Promotion code integration test", function () {
  this.timeout(60000)
  let promotionAdapter: PromotionAdapter;
  let promoCodeDiscount: any;
  let dish1: DishRecord = null;
  let dish2: DishRecord = null;

  before(async function () {
    promotionAdapter = Adapter.getPromotionAdapter()

    const discountGenerator = require(__dirname + "/../generators/discount.generator").default
    promoCodeDiscount = discountGenerator({
      concept: ["origin", "road"],
      id: 'promo-flat-123',
      isJoint: true,
      name: 'Promocode TEST123',
      badge: 'test',
      isPublic: false,
      createdByUser: true,
      configDiscount: {
        discountType: "flat",
        discountAmount: 1.45,
        dishes: [],
        groups: [],
        excludeModifiers: true
      },
    })
    await Promotion.createOrUpdate(promoCodeDiscount);
    await PromotionCode.findOrCreate(
      { id: "promocode-test-123" },
      {
        id: "promocode-test-123",
        description: "test 123",
        code: "TEST123"
      })
    //@ts-ignore
    await PromotionCode.addToCollection("promocode-test-123", "promotion", 'promo-flat-123')


    const groups = await Group.find({})
    const groupsId = groups.map(group => group.id)

    dish1 = await Dish.createOrUpdate(dishGenerator({ name: "test dish for promotion", price: 10.1, concept: "road", parentGroup: groupsId[0] }));
    dish2 = await Dish.createOrUpdate(dishGenerator({ name: "test fish for promotion", price: 15.2, concept: "road", parentGroup: groupsId[0] }));

  });

  after(async function () {
    await Promotion.destroy({})
  })


  it("Base countur promocode with flat discount (create new + apply)", async () => {
    let order = await Order.create({ id: "promotion-code-integration-test" }).fetch();
    await Order.updateOne({ id: order.id }, {  user: "user" });

    await Order.addDish({ id: order.id }, dish1, 5, [], "", "user");
    await Order.addDish({ id: order.id }, dish2, 4, [], "", "user");

    // VALID PROMOCODE
    await Order.applyPromotionCode({ id: order.id }, "TEST123");
    let result = await Order.findOne({ id: order.id })
    expect(result.promotionCodeString).to.equal("TEST123");    expect(result.promotionFlatDiscount).to.equal(1.45);

    expect(result.discountTotal).to.equal(1.45);    
    expect(result.total).to.equal(109.85);

    console.log("ORDER WITH PROMOTION", result)
    expect(result.basketTotal).to.equal(111.3);

    // After go to payment promocode should work, till ORDER state
    await TestPaymentSystem.getInstance();
    const paymentMethod = (await PaymentMethod.find({}))[0];
    await Order.check({ id: order.id }, customer, false, address, paymentMethod.id);
    await Order.payment({ id: order.id });
    result = await Order.findOne({ id: order.id })


    // CLEAR PROMOCODE
    await Order.applyPromotionCode({ id: order.id }, null);
    result = await Order.findOne({ id: order.id }).populate("dishes")
    expect(result.discountTotal).to.equal(0);
    console.log(result);
    expect(result.basketTotal).to.equal(111.3);
    expect(result.state).to.equal("CART");



    // NOT VALID PROMOCODE
    await Order.applyPromotionCode({ id: order.id }, "WINTER2024NHATRANG");
    result = await Order.findOne({ id: order.id })
    expect(result.discountTotal).to.equal(0);
    expect(result.basketTotal).to.equal(111.3);
    expect(result.promotionCodeCheckValidTill).to.equal(null);
    expect(result.promotionCodeString).to.equal("WINTER2024NHATRANG");
    expect(result.promotionCode).to.equal(null);

    //APPLY PROMOCODE AGAIN
    await Order.applyPromotionCode({ id: order.id }, "TEST123");
    result = await Order.findOne({ id: order.id })
    console.log("ORDER WITH PROMOTION 2", result)
    expect(result.promotionCodeString).to.equal("TEST123");
    expect(result.discountTotal).to.equal(1.45);
    expect(result.promotionFlatDiscount).to.equal(1.45);
    // expect(result.total).to.equal(109.85);
    expect(result.basketTotal).to.equal(111.3);
  });

  it("Percentage discount by promocode (Hot change existing + apply)", async () => {
    let a = await Promotion.update({ id: "promo-flat-123" }, {
      configDiscount: {
        discountType: "percentage",
        discountAmount: 10,
        dishes: [],
        groups: [],
        excludeModifiers: true
      }
    }).fetch()
    let order = await Order.create({ id: "promotion-hot-change-integration-test" }).fetch();

    await Order.addDish({ id: order.id }, dish1, 5, [], "", "user");
    await Order.addDish({ id: order.id }, dish2, 4, [], "", "user");

    // VALID PROMOCODE
    await Order.applyPromotionCode({ id: order.id }, "TEST123");
    let result = await Order.findOne({ id: order.id })
    expect(result.discountTotal).to.equal(11.13);
  })
});
