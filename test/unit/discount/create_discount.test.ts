// import exp = require("constants");
import Group from './../../../models/Group';
import Dish from './../../../models/Dish';
import Order from './../../../models/Order';
import { Adapter } from "../../../adapters";
import { expect } from "chai";
import AbstractPromotionHandler from '../../../adapters/promotion/AbstractPromotion';
import findModelInstanceByAttributes from './../../../libs/findModelInstance';
import Decimal from 'decimal.js';
import { PromotionAdapter } from '../../../adapters/promotion/default/promotionAdapter';

describe('Create_Discount', function () {

    let promotionAdapter: PromotionAdapter;

    before(async () =>{
      promotionAdapter =  Adapter.getPromotionAdapter()
    })


    it("Create discount test", async function () {
        let discountEx:AbstractPromotionHandler =  {
            id: "1-id",
            configDiscount: {
                discountType: "flat",
                discountAmount: 1,
                dishes: [],
                groups: [],
                excludeModifiers: true
              },
            name: "1-name",
            description: "string",
            concept: [],
            condition:  (arg: Group | Dish | Order): boolean => {
                if (findModelInstanceByAttributes(arg) === "Order" && discountEx.concept.includes(arg.concept)) {
                    // Order.populate()
                    return true;
                }
                
                if (findModelInstanceByAttributes(arg) === "Dish" && discountEx.concept.includes(arg.concept)) {
                    // TODO: check if includes in IconfigDish
                    return true;
                }
                
                if (findModelInstanceByAttributes(arg) === "Group" && discountEx.concept.includes(arg.concept)) {
                     // TODO: check if includes in IconfigG
                    return true;
                }
                
                return false
            },
            action: () => Promise.resolve({
                message:"",
                 state: {},
                 type: "test"
            }),
            isPublic: true,
            isJoint: true,
            // sortOrder: 0,
            displayGroup:  function (group:Group, user?: string): Group {
                if (this.isJoint === true && this.isPublic === true) {
                
                  group.discountAmount = promotionAdapter.promotions[this.id].configDiscount.discountAmount;
                  group.discountType = promotionAdapter.promotions[this.id].configDiscount.discountType;
                 }
                 
                return group
              },
              displayDish: function (dish:Dish, user?: string): Dish {
                if (this.isJoint === true && this.isPublic === true) {
                  // 
                  dish.discountAmount = promotionAdapter.promotions[this.id].configDiscount.discountAmount;
                  dish.discountType = promotionAdapter.promotions[this.id].configDiscount.discountType;
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
        await promotionAdapter.addPromotionHandler(discountEx)

        let discountById = promotionAdapter.getPromotionHandlerById(discountEx.id)

        // let byConceptE = await DiscountAdapter.getAllConcept(["E"])
        // let byConceptA = await DiscountAdapter.getAllConcept(["a"])

        expect(discountById.id).to.equal(discountEx.id);
      });
})
