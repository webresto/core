/// <reference path="./../../../index.ts" />
import path = require("path");
import { TestRMS } from "../../mocks/adapter/RMS";
import { Adapter } from "../../../adapters"; 
import { expect } from "chai";
import { address, customer } from "../../mocks/customer";
import AbstractPromotionAdapter from "../../../adapters/promotion/AbstractPromotionAdapter";
import { PromotionAdapter } from "../../../adapters/promotion/default/promotionAdapter";
import dishGenerator from "../../generators/dish.generator";
import { IconfigDiscount } from "../../../interfaces/ConfigDiscount";
import AbstractPromotionHandler from "../../../adapters/promotion/AbstractPromotion";
import { stringsInArray } from "../../../libs/stringsInArray";
import findModelInstanceByAttributes from "../../../libs/findModelInstance";
import { PromotionState } from "../../../models/Order";
import Group from './../../../models/Group';
import Dish from './../../../models/Dish';
import Order  from './../../../models/Order';
import Promotion  from './../../../models/Promotion';
import discountGenerator from "../../generators/discount.generator";
import ConfiguredPromotion from "../../../adapters/promotion/default/configuredPromotion";



describe("Promotion adapter integration test", function () {
  this.timeout(60000)
  
  before(async function() {

  });
  
  it("Configured discount total: 10% for all group", async () => {
    // // If item is added, then see that it stood in line.
    // // Pass the test response of Messaja
    // // if the Cost is added, he set
    // // if item is borrowed from him

    // var dishes = await Dish.find({})
    const groups = await Group.find({})
    const groupsId = groups.map(group => group.id)

    let discountAdapter:AbstractPromotionAdapter = PromotionAdapter.initialize()
    let order = await Order.create({id: "configured-promotion-integration-testa"}).fetch();
    await Order.updateOne({id: order.id}, {concept: "road",user: "user"});

    let dish1 = await Dish.createOrUpdate(dishGenerator({name: "test dish", price: 10.1, concept: "road"}));
    let dish2 = await Dish.createOrUpdate(dishGenerator({name: "test fish", price: 15.2, concept: "road"}));
    await Order.addDish({id: order.id}, dish1, 5, [], "", "test");
    await Order.addDish({id: order.id}, dish2, 4, [], "", "test");
    let dishes = await Dish.find({})
    const dishesId = dishes.map(dish => dish.id)

    let config:IconfigDiscount = {
      discountType: "percentage",
      discountAmount: 10,
      dishes: dishesId,
      groups: groupsId,
      excludeModifiers: true
    }

    let promotion10Percent = new ConfiguredPromotion({
      concept: ["road"],
      id: 'aa2-id',
      isJoint: true,
      name: 'awdawd',
      isPublic: true,
      configDiscount: config,
      description: "aaa",
      externalId: "externalID"
    }, 
    config)

    await discountAdapter.addPromotionHandler(promotion10Percent)

    order = await Order.findOne(order.id)
    await discountAdapter.processOrder(order)
  
    let result = await Order.findOne(order.id) 
    // console.log(result)
    expect(result.discountTotal).to.equal(11.13);




    
    // order = await Order.findOne({id: order.id});
    // await Order.check({id: order.id}, customer, false, address);
    // order = await Order.findOne(order.id)
    // expect(order.deliveryCost).to.equal(0);
    // expect(order.deliveryItem).to.equal(null);

    // // Flat delivery cost
    // const deliveryCost = 2.75;
    // await Settings.set("DELIVERY_COST", deliveryCost)
    // await Order.check({id: order.id}, customer, false, address);
    // order = await Order.findOne(order.id)
    // expect(order.deliveryCost).to.equal(2.75);
    // expect(order.deliveryItem).to.equal(null);
    

    // // check self service 
    // await Order.check({id: order.id}, customer, true);
    // order = await Order.findOne(order.id)
    // expect(order.deliveryDescription).to.equal('');
    // expect(order.deliveryCost).to.equal(0);
    // expect(order.deliveryItem).to.equal(null);
    

    // // Delviery item
    // const deliveryItem = dishes[2]
    // await Settings.set("DELIVERY_ITEM", deliveryItem.id);
    // await Order.check({id: order.id}, customer, false, address);
    // order = await Order.findOne(order.id)
    // expect(order.deliveryCost).to.equal(deliveryItem.price);
    // expect(order.deliveryItem).to.equal(deliveryItem.id);
    
    // // Delivery message
    // const deliveryMessage = "Test123 123 %%%"
    // await Settings.set("DELIVERY_MESSAGE", deliveryMessage)
    // await Order.check({id: order.id}, customer, false, address);
    // order = await Order.findOne(order.id)
    // expect(order.deliveryDescription).to.equal(deliveryMessage);
    
    
    // const freeDeliveryFrom = 333
    // await Settings.set("FREE_DELIVERY_FROM", freeDeliveryFrom)
    // await Order.addDish({id: order.id}, dishes[3], Math.ceil(freeDeliveryFrom/dishes[3].price), [], "", "user");
    // await Order.check({id: order.id}, customer, false, address);
    // order = await Order.findOne(order.id)
    // expect(order.deliveryDescription).to.equal('');
    // expect(order.deliveryCost).to.equal(0);
    // expect(order.deliveryItem).to.equal(null);    

  });
  
  it("IsJoint: false configured discount over total discount for specific dish", async ()=>{
    
    // check specific group and dish for joint:false
    let config:IconfigDiscount = {
      discountType: "percentage",
      discountAmount: 10,
      dishes: ["Aaa"],
      groups: ["Aaa"],
      excludeModifiers: true
    }

    let promotion10 = new ConfiguredPromotion({
      concept: ["jointfalse"],
      id: 'config2-id',
      isJoint: false,
      name: 'awdawd',
      isPublic: true,
      configDiscount:  config,
      description: "aaa",
      externalId: "externalID2"
    }, 
    config)

    let promotion1flat:AbstractPromotionHandler = discountGenerator({
      concept: ["jointfalse"],
      id: 'aa22-id',
      isJoint: true,
      name: 'awdaawd',
      isPublic: true,
      configDiscount: {
        discountType: "flat",
        discountAmount: 1,
        dishes: ["Aaa"],
        groups: ["Aaa"],
        excludeModifiers: true
      },
    })

    let discountAdapter:AbstractPromotionAdapter = PromotionAdapter.initialize()
    let order = await Order.create({id: "configured-promotion-integration-test-joint-false"}).fetch();
    await Order.updateOne({id: order.id}, {concept: "jointfalse",user: "user"});

    let dish1 = await Dish.createOrUpdate(dishGenerator({name: "test dish", price: 10.1, concept: "jointfalse"}));
    let dish2 = await Dish.createOrUpdate(dishGenerator({name: "test fish", price: 15.2, concept: "jointfalse"}));
        
    await Order.addDish({id: order.id}, dish1, 5, [], "", "test");
    await Order.addDish({id: order.id}, dish2, 4, [], "", "test");

    await discountAdapter.addPromotionHandler(promotion10)
    await discountAdapter.addPromotionHandler(promotion1flat)

    order = await Order.findOne(order.id)
    await discountAdapter.processOrder(order)
    
    let result = await Order.findOne(order.id) 
    expect(result.discountTotal).to.equal(11.13);
  })
  
  it("configured discount for specific dish/group, over total discount with sortOrder", async ()=>{
    let discountAdapter:AbstractPromotionAdapter = PromotionAdapter.initialize()

    let config:IconfigDiscount = {
      discountType: "percentage",
      discountAmount: 10,
      dishes: ["Aaa"],
      groups: ["Aaa"],
      excludeModifiers: true
    }

    let promotion10 = new ConfiguredPromotion({
      concept: ["amongus"],
      id: 'config2addawawdaw-id',
      isJoint: false,
      name: 'Promotion',
      isPublic: true,
      configDiscount: config,
      description: "aaa",
      externalId: "externalID2awdawd"
    }, 
    config)

    // let createInModelPromotion: Promotion = {
    //   id: 'config2addaw-id',
    //   isJoint: false,
    //   name: "Promotion",
    //   isPublic: true,
    //   isDeleted: false,
    //   createdByUser: true,
    //   description: "aaa",
    //   concept: ["amongus"],
    //   configDiscount: config,
    //   sortOrder: 1,
    //   externalId: "Promotion3",
    //   worktime: null,
    //   enable: true
    // };

    // await Promotion.createOrUpdate(createInModelPromotion);

    let order = await Order.create({id: "configured-promotion-integration-test-diff"}).fetch();
    await Order.updateOne({id: order.id}, {concept: "amongus",user: "user"});

    let dish1 = await Dish.createOrUpdate(dishGenerator({name: "test dish", price: 10.1, concept: "amongus"}));
    let dish2 = await Dish.createOrUpdate(dishGenerator({name: "test fish", price: 15.2, concept: "amongus"}));
        
    await Order.addDish({id: order.id}, dish1, 5, [], "", "test");
    await Order.addDish({id: order.id}, dish2, 4, [], "", "test");

    order = await Order.findOne(order.id)

    await discountAdapter.addPromotionHandler(promotion10)
    await discountAdapter.processOrder(order)
    
    let result = await Order.findOne(order.id) 
    // console.log(result)

    expect(result.discountTotal).to.equal(11.13);
  })


  //   /**
  //    * Here need add 2 discount for cross group and check what is stop after first found
  //    */


  
  it("Check flat and percentage discount for specific dish/group and sortOrder", async ()=>{
    
    let flatDiscount:AbstractPromotionHandler = discountGenerator({
      concept: ["specific"],
      id: 'flat2-id',
      isJoint: true,
      name: 'awdaawd',
      isPublic: true,
      configDiscount: {
        discountType: "flat",
        discountAmount: 1,
        dishes: ["Aaa"],
        groups: ["Aaa"],
        excludeModifiers: true
      },
    })

    let percentDiscount:AbstractPromotionHandler = discountGenerator({
      concept: ["specific"],
      id: 'percent2-id',
      isJoint: true,
      name: 'awdaawd',
      isPublic: true,
      configDiscount: {
        discountType: "percentage",
        discountAmount: 10,
        dishes: ["Aaa"],
        groups: ["Aaa"],
        excludeModifiers: true
      },
    })

    let discountAdapter:AbstractPromotionAdapter = PromotionAdapter.initialize()

    let order = await Order.create({id: "configured-promotion-integration-specific"}).fetch();
    await Order.updateOne({id: order.id}, {concept: "specific",user: "user"});

    let dish1 = await Dish.createOrUpdate(dishGenerator({name: "test dish", price: 10.1, concept: "specific"}));
    let dish2 = await Dish.createOrUpdate(dishGenerator({name: "test fish", price: 15.2, concept: "specific"}));
        
    await Order.addDish({id: order.id}, dish1, 5, [], "", "test");
    await Order.addDish({id: order.id}, dish2, 4, [], "", "test");

    await discountAdapter.addPromotionHandler(flatDiscount)
    await discountAdapter.addPromotionHandler(percentDiscount)

    order = await Order.findOne(order.id)
    await discountAdapter.processOrder(order)
    
    let result = await Order.findOne(order.id) 
    // console.log(result)

    expect(result.discountTotal).to.equal(20.13);

  })
  
  
  it("Promotion states should passed in order discount", async ()=>{
    let promotion10state:AbstractPromotionHandler = discountGenerator({
      concept: ["PromotionStatess"],
      id: 'flat2aaawa-id',
      isJoint: true,
      name: 'awdaawad',
      isPublic: true,
      configDiscount: {
        discountType: "flat",
        discountAmount: 1,
        dishes: ["aaawdawa"],
        groups: ["awdawdwa"],
        excludeModifiers: true
      },
    })

    let discountAdapter:AbstractPromotionAdapter = PromotionAdapter.initialize()
    await discountAdapter.addPromotionHandler(promotion10state)

    let order = await Order.create({id: "configured-promotion-integration-states"}).fetch();
    await Order.updateOne({id: order.id}, {concept: "PromotionStatess",user: "user"});

    let dish1 = await Dish.createOrUpdate(dishGenerator({name: "test dish", price: 10.1, concept: "PromotionStatess"}));
    let dish2 = await Dish.createOrUpdate(dishGenerator({name: "test fish", price: 15.2, concept: "PromotionStatess"}));
        
    await Order.addDish({id: order.id}, dish1, 5, [], "", "test");
    await Order.addDish({id: order.id}, dish2, 4, [], "", "test");

    let res = await Order.findOne(order.id) 

    // await discountAdapter.processOrder(res)
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
 
  

  it("Check prepend recursion discount", async ()=>{
    // for call recursion we should add dish from action in promotionHandler

    let discountEx1:AbstractPromotionHandler =  {
      id: "1aw42-idaaa",
      configDiscount: {
          discountType: "flat",
          discountAmount: 1,
          dishes: ["a"],
          groups: ["a"],
          excludeModifiers: true
        },
      name: "1124-name",
      description: "sawdad",
      concept: ["recursion"],
      condition: (arg: Group | Dish | Order): boolean =>{
        if (findModelInstanceByAttributes(arg) === "Order" && stringsInArray(arg.concept, discountEx1.concept) ) {
          // let res:Order = arg as Order
          // Order.populate()
          //discountEx.concept.includes(arg.concept)
          // console.log(arg, "ARGG===============================================")
          // console.log(res.dishes," CONDITION RES")
          return true;
      }
      
      if (findModelInstanceByAttributes(arg) === "Dish" && stringsInArray(arg.concept, discountEx1.concept)) {
          // TODO: check if includes in IconfigDish
          return true;
      }
      
      if (findModelInstanceByAttributes(arg) === "Group" && stringsInArray(arg.concept, discountEx1.concept) ) {
           // TODO: check if includes in IconfigG
          return true;
      }
      
      return false
    },
      action: async (order: Order): Promise<PromotionState> => {
          // console.log("ACTION ================awdawdawd")
  
          let dish1 = await Dish.createOrUpdate(dishGenerator({name: "test fish", price: 15.2, concept: "recursion"}));
          await Order.addDish({id: order.id}, dish1, 5, [], "", "test");
  
          let configPromotion: ConfiguredPromotion = new ConfiguredPromotion(discountEx1, discountEx1.configDiscount)
          return await configPromotion.applyPromotion(order.id)
      },
      isPublic: true,
      isJoint: true,
      // sortOrder: 0,
      displayGroup: async function (group:Group, user?: string): Promise<Group[]> {
        if(user){
          //  return await Dish.display(this.concept, group.id)
          return await Group.display(group)
        }
      },
      displayDish: async function (dish:Dish, user?: string): Promise<Dish[]> {
        if(user){
          //  return await Dish.display(this.concept, group.id)
          return await Dish.display(dish)
        }
      },
      externalId: "1-externalIdaw",
  }
    
    let discountAdapter:AbstractPromotionAdapter = PromotionAdapter.initialize()
    await discountAdapter.addPromotionHandler(discountEx1)

    let order = await Order.create({id: "configured-promotion-integration-recursion"}).fetch();
    await Order.updateOne({id: order.id}, {concept: "recursion",user: "user"});

    let dish1 = await Dish.createOrUpdate(dishGenerator({name: "test dish", price: 10.1, concept: "recursion"}));
    let dish2 = await Dish.createOrUpdate(dishGenerator({name: "test fish", price: 15.2, concept: "recursion"}));
        
    await Order.addDish({id: order.id}, dish1, 5, [], "", "test");
    // 5 dishes + 5 from action
    await Order.addDish({id: order.id}, dish2, 4, [], "", "test");
    // 4 dishes + 5 from action
    
    let result = await Order.findOne(order.id) 
    expect(result.discountTotal).to.equal(19);
  })
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
