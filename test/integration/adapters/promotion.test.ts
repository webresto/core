/// <reference path="./../../../index.ts" />
import path = require("path");
import { TestRMS } from "../../mocks/adapter/RMS";
import { Adapter } from "../../../adapters"; 
import { expect } from "chai";
import { address, customer } from "../../mocks/customer";
import AbstractPromotionAdapter from "../../../adapters/promotion/AbstractPromotionAdapter";
import { PromotionAdapter } from "../../../adapters/promotion/default/promotionAdapter";
import dishGenerator from "../../generators/dish.generator";
import configuredPromotion from "../../../adapters/promotion/default/configuredPromotion";
import { IconfigDiscount } from "../../../interfaces/ConfigDiscount";
import AbstractPromotionHandler from "../../../adapters/promotion/AbstractPromotion";
import { stringsInArray } from "../../../libs/stringsInArray";
import findModelInstanceByAttributes from "../../../libs/findModelInstance";
import { PromotionState } from "../../../models/Order";
import Group from './../../../models/Group';
import Dish from './../../../models/Dish';
import Order  from './../../../models/Order';


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

    // let order = await Order.create({id: "configured-promotion-integration-test"}).fetch();
    // await Order.addDish({id: order.id}, dishes[0], 1, [], "", "user");
    
    let config:IconfigDiscount = {
      discountType: "percentage",
      discountAmount: 10,
      dishes: [],
      groups: [],
      excludeModifiers: true
    }

    let promotion10Percent = new configuredPromotion({
      concept: ["road"],
      id: 'aa2-id',
      isJoint: true,
      name: 'awdawd',
      isPublic: true,
      configDiscount: null,
      description: "aaa",
      externalId: "externalID"
    }, 
    config)

    let discountAdapter:AbstractPromotionAdapter = PromotionAdapter.initialize()
    let order = await Order.create({id: "configured-promotion-integration-testa"}).fetch();
    await Order.updateOne({id: order.id}, {concept: "road",user: "user"});

    let dish1 = await Dish.createOrUpdate(dishGenerator({name: "test dish", price: 10.1, concept: "road"}));
    let dish2 = await Dish.createOrUpdate(dishGenerator({name: "test fish", price: 15.2, concept: "road"}));
        
    await Order.addDish({id: order.id}, dish1, 5, [], "", "test");
    await Order.addDish({id: order.id}, dish2, 4, [], "", "test");

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

  it("IsJoint: false configured discount over total discount for specific dish", ()=>{})
  
  it("configured discount for specific dish/group, over total discount with sortOrder", ()=>{})
    /**
     * Here need add 2 discount for cross group and check what is stop after first found
     */

  it("Check flat and percentage discount for specific dish/group", ()=>{})

  it("Promotion states should passed in order", ()=>{})

  it("Check prepend recursion", async ()=>{
    // for call recursion we should add dish from action in promotionHandler
    
    let discountEx:AbstractPromotionHandler =  {
      id: "1-id",
      configDiscount: {
          discountType: "percentage",
          discountAmount: 10,
          dishes: [],
          groups: [],
          excludeModifiers: true
        },
      name: "1-name",
      description: "string",
      concept: ["origin","clear","Happy Birthday","Recursion"],
      condition: (arg: Group | Dish | Order): boolean =>{
        if (findModelInstanceByAttributes(arg) === "Order" && stringsInArray(arg.concept, discountEx.concept) ) {
          // Order.populate()
          //discountEx.concept.includes(arg.concept)
          return true;
      }
      
      if (findModelInstanceByAttributes(arg) === "Dish" && stringsInArray(arg.concept, discountEx.concept)) {
          // TODO: check if includes in IconfigDish
          return true;
      }
      
      if (findModelInstanceByAttributes(arg) === "Group" && stringsInArray(arg.concept, discountEx.concept) ) {
           // TODO: check if includes in IconfigG
          return true;
      }
      
      return false
    },
      action: async (order: Order): Promise<PromotionState> => {
          // console.log("ACTION ================awdawdawd")
          let dish1 = await Dish.createOrUpdate(dishGenerator({name: "test fish", price: 15.2, concept: "Recursion"}));
          await Order.addDish({id: order.id}, dish1, 5, [], "", "test");

          return await configuredPromotion.applyPromotion(order.id, discountEx.configDiscount, discountEx.id)
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
      externalId: "1-externalId",
  }

    let discountAdapter:AbstractPromotionAdapter = PromotionAdapter.initialize()
    let order = await Order.create({id: "configured-promotion-integration-recursion"}).fetch();
    await Order.updateOne({id: order.id}, {concept: "Recursion",user: "user"});

    let dish1 = await Dish.createOrUpdate(dishGenerator({name: "test dish", price: 10.1, concept: "Recursion"}));
    let dish2 = await Dish.createOrUpdate(dishGenerator({name: "test fish", price: 15.2, concept: "Recursion"}));
        
    await Order.addDish({id: order.id}, dish1, 5, [], "", "test");
    await Order.addDish({id: order.id}, dish2, 4, [], "", "test");

    await discountAdapter.addPromotionHandler(discountEx)

    order = await Order.findOne(order.id)
    await discountAdapter.processOrder(order)
    
    let result = await Order.findOne(order.id) 
    // console.log(result)

    expect(result.discountTotal).to.equal(11.13);


  })
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
