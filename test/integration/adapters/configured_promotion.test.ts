/// <reference path="./../../../index.ts" />
import { Adapter } from "../../../adapters";
import { expect } from "chai";
import dishGenerator from "../../generators/dish.generator";
import { IconfigDiscount } from "../../../interfaces/ConfigDiscount";
import AbstractPromotionHandler from "../../../adapters/promotion/AbstractPromotion";
// todo: fix types model instance to {%ModelName%}Record for Promotion';
import discountGenerator from "../../generators/discount.generator";
import ConfiguredPromotion from "../../../adapters/promotion/default/configuredPromotion";
import { PromotionAdapter } from "../../../adapters/promotion/default/promotionAdapter";
import { PromotionRecord } from "../../../models/Promotion";



describe("Promotion adapter integration test", function () {
  this.timeout(60000)
  let promotionAdapter: PromotionAdapter;

  before(async function () {
    promotionAdapter = Adapter.getPromotionAdapter()
  });

  after(async function () {
    // await Promotion.destroy({})
  })


  it("Configured discount total: 10% for all group", async () => {
    // // If item is added, then see that it stood in line.
    // // Pass the test response of Messaja
    // // if the Cost is added, he set
    // // if item is borrowed from him

    // var dishes = await Dish.find({})


    let order = await Order.create({ id: "configured-promotion-integration-testa" }).fetch();
    await Order.updateOne({ id: order.id }, { user: "user" });

    const groups = await Group.find({})
    const groupsId = groups.map(group => group.id)

    let dish1 = await Dish.createOrUpdate(dishGenerator({ name: "test dish", price: 10.1, concept: "road", parentGroup: groupsId[0] }));
    let dish2 = await Dish.createOrUpdate(dishGenerator({ name: "test fish", price: 15.2, concept: "road", parentGroup: groupsId[0] }));

    let dishes = await Dish.find({})
    const dishesId = dishes.map(dish => dish.id)

    let config: IconfigDiscount = {
      discountType: "percentage",
      discountAmount: 10,
      dishes: dishesId,
      groups: groupsId,
      excludeModifiers: true
    }

    let promotion10Percent = new ConfiguredPromotion({
        concept: ["road"],
        id: 'aa2-id-promotion10',
        badge: 'test',
        isJoint: true,
        name: 'awdawd',
        isPublic: true,
        configDiscount: config,
        description: "aaa",
        externalId: "externalID"
      },
      config)

    await promotionAdapter.addPromotionHandler(promotion10Percent)

    await Order.addDish({ id: order.id }, dish1, 5, [], "", "user");
    await Order.addDish({ id: order.id }, dish2, 4, [], "", "user");

    let result = await Order.findOne(order.id)
    expect(result.discountTotal).to.equal(11.13);
  });



  it("IsJoint: false configured discount over total discount for specific dish", async () => {
    // check specific group and dish for joint:false


    let order = await Order.create({ id: "configured-promotion-integration-test-joint-false" }).fetch();
    await Order.updateOne({ id: order.id }, { user: "user" });

    const groups = await Group.find({})
    const groupsId = groups.map(group => group.id)

    let dish1 = await Dish.createOrUpdate(dishGenerator({ name: "test dish", price: 10.1, concept: "jointfalse", parentGroup: groupsId[0] }));
    let dish2 = await Dish.createOrUpdate(dishGenerator({ name: "test fish", price: 15.2, concept: "jointfalse", parentGroup: groupsId[0] }));

    let dishes = await Dish.find({})
    const dishesId = dishes.map(dish => dish.id)

    let config: IconfigDiscount = {
      discountType: "percentage",
      discountAmount: 10,
      dishes: dishesId,
      groups: groupsId,
      excludeModifiers: true
    }

    let promotion10 = new ConfiguredPromotion({
      concept: ["jointfalse"],
      id: 'config2-id',
      isJoint: false,
      name: 'awdawd',
      isPublic: true,
      badge: 'test',
      configDiscount: config,
      description: "aaa",
      externalId: "externalID2"
    },
      config)

    let promotion1flat: AbstractPromotionHandler = discountGenerator({
      concept: ["jointfalse"],
      id: 'aa22-id',
      badge: 'test',
      isJoint: true,
      name: 'awdaawd',
      isPublic: true,
      configDiscount: {
        discountType: "flat",
        discountAmount: 1,
        dishes: dishesId,
        groups: groupsId,
        excludeModifiers: true
      },
    })

    await promotionAdapter.addPromotionHandler(promotion10)
    await promotionAdapter.addPromotionHandler(promotion1flat)

    await Order.addDish({ id: order.id }, dish1, 5, [], "", "user");
    await Order.addDish({ id: order.id }, dish2, 4, [], "", "user");

    let result = await Order.findOne(order.id)
    expect(result.discountTotal).to.equal(11.13);
  })


  it("configured discount for specific dish/group, over total discount with sortOrder", async () => {


    const groups = await Group.find({})
    const groupsId = groups.map(group => group.id)

    let order = await Order.create({ id: "configured-promotion-integration-test-diff" }).fetch();
    await Order.updateOne({ id: order.id }, { user: "user" });

    let dish1 = await Dish.createOrUpdate(dishGenerator({ name: "test dish", price: 10.1, concept: "amongus", parentGroup: groupsId[0] }));
    let dish2 = await Dish.createOrUpdate(dishGenerator({ name: "test fish", price: 15.2, concept: "amongus", parentGroup: groupsId[1] }));

    let dishes = await Dish.find({})
    const dishesId = dishes.map(dish => dish.id)

    let config: IconfigDiscount = {
      discountType: "percentage",
      discountAmount: 10,
      dishes: dishesId,
      groups: groupsId,
      excludeModifiers: true
    }
    let config2: IconfigDiscount = {
      discountType: "flat",
      discountAmount: 1,
      dishes: [dish1.id],
      groups: groupsId,
      excludeModifiers: true
    }

    let createInModelPromotion: PromotionRecord = {
      id: 'config2addaw-idawdawd',
      isJoint: false,
      name: "Promotion",
      badge: 'test',
      isPublic: true,
      isDeleted: false,
      createdByUser: true,
      description: "aaa",
      concept: ["amongus"],
      configDiscount: config2,
      sortOrder: -1,
      externalId: "Promotion3",
      worktime: null,
      enable: true
    };

    await Promotion.createOrUpdate(createInModelPromotion);

    // TODO: check Promotion.createOrUpdate({createdByUser: true})

    let promotion10 = new ConfiguredPromotion({
      concept: ["amongus"],
      id: 'config2addawawdaw-id',
      badge: 'test',
      isJoint: false,
      name: 'Promotion',
      isPublic: true,
      configDiscount: config,
      description: "aaa",
      externalId: "externalID2awdawd"
    },
      config)

    await promotionAdapter.addPromotionHandler(promotion10)

    await Order.addDish({ id: order.id }, dish1, 5, [], "", "user");
    await Order.addDish({ id: order.id }, dish2, 4, [], "", "user");

    let result = await Order.findOne(order.id)

    expect(result.discountTotal).to.equal(5);
  })

  //   /**
  //    * Here need add 2 discount for cross group and check what is stop after first found
  //    */


  // it("Check flat and percentage discount for specific dish/group", async () => {
  //   let order = await Order.create({ id: "configured-promotion-integration-specific" }).fetch();
  //   await Order.updateOne({ id: order.id }, { user: "user" });

  //   const groups = await Group.find({})
  //   const groupsId = groups.map(group => group.id)

  //   let dish1 = await Dish.createOrUpdate(dishGenerator({ name: "test dish", price: 10.1, concept: "specific", parentGroup: groupsId[0] }));
  //   let dish2 = await Dish.createOrUpdate(dishGenerator({ name: "test fish", price: 15.2, concept: "specific", parentGroup: groupsId[1] }));

  //   let dishes = await Dish.find({})
  //   const dishesId = dishes.map(dish => dish.id)

  //   let flatDiscount: AbstractPromotionHandler = discountGenerator({
  //     concept: ["specific"],
  //     badge: 'test',
  //     id: 'flat2-id',
  //     isJoint: true,
  //     name: 'awdaawd',
  //     isPublic: true,
  //     configDiscount: {
  //       discountType: "flat",
  //       discountAmount: 1,
  //       dishes: dishesId,
  //       groups: groupsId,
  //       excludeModifiers: true
  //     },
  //   })

  //   let percentDiscount: AbstractPromotionHandler = discountGenerator({
  //     badge: 'test',
  //     concept: ["specific"],
  //     id: 'percent2-id',
  //     isJoint: true,
  //     name: 'awdaawd',
  //     isPublic: true,
  //     configDiscount: {
  //       discountType: "percentage",
  //       discountAmount: 10,
  //       dishes: [dish1.id],
  //       groups: groupsId,
  //       excludeModifiers: true
  //     },
  //   })

  //   let percentDiscount2: AbstractPromotionHandler = discountGenerator({
  //     concept: ["specific"],
  //     badge: 'test',
  //     id: 'percent2-idawdawd',
  //     isJoint: true,
  //     name: 'awdaawawdd',
  //     isPublic: true,
  //     configDiscount: {
  //       discountType: "percentage",
  //       discountAmount: 10,
  //       dishes: [dish1.id],
  //       groups: [groupsId[1]],
  //       excludeModifiers: true
  //     },
  //   })

  //   let percentDiscount3: AbstractPromotionHandler = discountGenerator({
  //     concept: ["specific"],
  //     id: 'percent2-idawdawd',
  //     isJoint: true,
  //     badge: 'test',
  //     name: 'awdaawawdd',
  //     isPublic: true,
  //     configDiscount: {
  //       discountType: "percentage",
  //       discountAmount: 10,
  //       dishes: [dish1.id, dish2.id],
  //       groups: [groupsId[1]],
  //       excludeModifiers: true
  //     },
  //   })

  //   await promotionAdapter.addPromotionHandler(flatDiscount)
  //   await promotionAdapter.addPromotionHandler(percentDiscount)
  //   await promotionAdapter.addPromotionHandler(percentDiscount2)
  //   await promotionAdapter.addPromotionHandler(percentDiscount3)

  //   await Order.addDish({ id: order.id }, dish1, 5, [], "", "user");
  //   await Order.addDish({ id: order.id }, dish2, 4, [], "", "user");

  //   order = await Order.findOne(order.id)
  //   // console.log(order, 234)
  //   expect(order.discountTotal).to.equal(20.13);

  // })


  it("Promotion states should passed in order discount", async () => {


    let order = await Order.create({ id: "configured-promotion-integration-states" }).fetch();
    await Order.updateOne({ id: order.id }, { user: "user" });

    const groups = await Group.find({})
    const groupsId = groups.map(group => group.id)


    let dish1 = await Dish.createOrUpdate(dishGenerator({ name: "test dish", price: 10.1, concept: "PromotionStatess", parentGroup: groupsId[0] }));
    let dish2 = await Dish.createOrUpdate(dishGenerator({ name: "test fish", price: 15.2, concept: "PromotionStatess", parentGroup: groupsId[0] }));



    let dishes = await Dish.find({})
    const dishesId = dishes.map(dish => dish.id)

    let promotion10state: AbstractPromotionHandler = discountGenerator({
      concept: ["PromotionStatess"],
      id: 'flat2aaawa-id',
      isJoint: true,
      badge: 'test',
      name: 'awdaawad',
      isPublic: true,
      configDiscount: {
        discountType: "flat",
        discountAmount: 1,
        dishes: dishesId,
        groups: groupsId,
        excludeModifiers: true
      },
    })
    await promotionAdapter.addPromotionHandler(promotion10state)

    await Order.addDish({ id: order.id }, dish1, 5, [], "", "user");
    await Order.addDish({ id: order.id }, dish2, 4, [], "", "user");

    let res = await Order.findOne(order.id)

    // await promotionAdapter.processOrder(res)
    // res = await Order.findOne(order.id)

    let example = {
      message: `Discount generator description`,
      type: "configured-promotion",
      state: {}
    }
    expect(res.discountTotal).to.equal(9);
    expect(res.promotionState[0].message).to.equal(example.message);
    expect(res.promotionState[0].type).to.equal(example.type);
    // expect(order.promotionState[0].state).to.equal(example.state);
  })

  // it("Check display group and display dish", async ()=>{
  //     await Dish.display({id: "my-displayed-dish"})

  // })


  it("Check prepend recursion discount", async () => {
    // TODO: check recrsion behavior
  })
});
