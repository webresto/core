import dishGenerator from '../../generators/dish.generator';
import { expect } from 'chai';

// import AbstractPromotionHandler from '@webresto/core/adapters/discount/AbstractPromotion';
import { InMemoryDiscountAdapter } from '../../mocks/adapter/discount';
import discountGenerator from '../../generators/discount.generator';
import groupGenerator from '../../generators/group.generator';
import AbstractPromotionHandler from '../../../adapters/promotion/AbstractPromotion';
import { PromotionAdapter } from '../../../adapters/promotion/default/promotionAdapter';
import findModelInstanceByAttributes from '../../../libs/findModelInstance';
import { Adapter } from '../../../adapters/index';
import AbstractPromotionAdapter from '../../../adapters/promotion/AbstractPromotionAdapter';
import Group from '../../../models/Group';
import Dish from '../../../models/Dish';
import Order, { PromotionState } from '../../../models/Order';
import { stringsInArray } from '../../../libs/stringsInArray';
import ConfiguredPromotion from '../../../adapters/promotion/default/configuredPromotion';
import Decimal from 'decimal.js';

describe('Discount_Empty', function () {
    after(async function() {
      await Promotion.destroy({})
    })

    let discountEx:AbstractPromotionHandler =  {
        id: "1-id",
        configDiscount: {
            discountType: "flat",
            discountAmount: 1.33,
            dishes: ["a"],
            groups: ["a"],
            excludeModifiers: true
          },
        name: "1-name",
        description: "string",
        concept: [""],
        condition: (arg: Group | Dish | Order): boolean =>{
          if (findModelInstanceByAttributes(arg) === "Order" && (discountEx.concept[0] === undefined || discountEx.concept[0] === "") 
          ? true : stringsInArray(arg.concept, discountEx.concept) ) {
            // Order.populate()
            //discountEx.concept.includes(arg.concept)
            return true;
        }
        
        return false
      },
        action: async (order: Order): Promise<PromotionState> => {
            // console.log("ACTION ================awdawdawd")
             return await configuredPromotion.applyPromotion(order.id) 
        },
        isPublic: true,
        isJoint: true,
        // sortOrder: 0,
        displayGroup:  function (group:Group, user?: string): Group {
          if (this.isJoint === true && this.isPublic === true) {
          
            group.discountAmount = PromotionAdapter.promotions[this.id].configDiscount.discountAmount;
            group.discountType = PromotionAdapter.promotions[this.id].configDiscount.discountType;
           }
           
          return group
        },
        displayDish: function (dish:Dish, user?: string): Dish {
          if (this.isJoint === true && this.isPublic === true) {
            // 
            dish.discountAmount = PromotionAdapter.promotions[this.id].configDiscount.discountAmount;
            dish.discountType = PromotionAdapter.promotions[this.id].configDiscount.discountType;
            dish.oldPrice = dish.price
  
            dish.price = this.configDiscount.discountType === "flat" 
            ? new Decimal(dish.price).minus(+this.configDiscount.discountAmount).toNumber()
            : new Decimal(dish.price)
                .mul(+this.configDiscount.discountAmount / 100)
                .toNumber()  
          }
          return dish
        },
        externalId: "1-externalId",
    }

    let configuredPromotion: ConfiguredPromotion
    let groupsId = []

    before(async () =>{
      configuredPromotion = new ConfiguredPromotion(discountEx, discountEx.configDiscount)
      const groups = await Group.find({})
      groupsId = groups.map(group => group.id)
      discountEx.configDiscount.groups = groupsId
   })  

      it("discount empty concept", async function () {
        let discountAdapter:AbstractPromotionAdapter = PromotionAdapter.initialize()
        let order = await Order.create({id: "add-dish-empty-concept"}).fetch();
        await Order.updateOne({id: order.id}, {user: "user"});

        let dish1 = await Dish.createOrUpdate(dishGenerator({name: "test dish", price: 10.1, concept: "a",parentGroup:groupsId[0]}));
        let dish2 = await Dish.createOrUpdate(dishGenerator({name: "test fish", price: 15.2, concept: "a",parentGroup:groupsId[0]}));
        
        discountEx.configDiscount.dishes.push(dish1.id)
        discountEx.configDiscount.dishes.push(dish2.id)
        await discountAdapter.addPromotionHandler(discountEx)

        await Order.addDish({id: order.id}, dish1, 5, [], "", "test");
        await Order.addDish({id: order.id}, dish2, 4, [], "", "test");

        let result = await Order.findOne(order.id) 
        expect(result.discountTotal).to.equal(11.97);
      });

      it("discount empty concept but order with concept", async function () {
        let discountAdapter:AbstractPromotionAdapter = PromotionAdapter.initialize()
        let order = await Order.create({id: "add-dish-empty"}).fetch();
        await Order.updateOne({id: order.id}, {concept: "origin",user: "user"});

        let dish1 = await Dish.createOrUpdate(dishGenerator({name: "test dish", price: 10.1, concept: "a",parentGroup:groupsId[0]}));
        let dish2 = await Dish.createOrUpdate(dishGenerator({name: "test fish", price: 15.2, concept: "a",parentGroup:groupsId[0]}));
        
        discountEx.configDiscount.dishes.push(dish1.id)
        discountEx.configDiscount.dishes.push(dish2.id)
        await discountAdapter.addPromotionHandler(discountEx)

        await Order.addDish({id: order.id}, dish1, 5, [], "", "test");
        await Order.addDish({id: order.id}, dish2, 4, [], "", "test");

        let result = await Order.findOne(order.id) 
        expect(result.discountTotal).to.equal(11.97);
      });

})




