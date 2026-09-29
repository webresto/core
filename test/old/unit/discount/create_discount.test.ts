// import exp = require("constants");
// todo: fix types model instance to {%ModelName%}Record for Group';
// todo: fix types model instance to {%ModelName%}Record for Dish';
// todo: fix types model instance to {%ModelName%}Record for Order';
import { Adapter } from "../../../adapters";
import { expect } from "chai";
import AbstractPromotionHandler from '../../../adapters/promotion/AbstractPromotion';
import findModelInstanceByAttributes from './../../../libs/findModelInstance';
import Decimal from 'decimal.js';
import { PromotionAdapter } from '../../../adapters/promotion/default/promotionAdapter';
import { someInArray } from '../../../libs/stringsInArray';
import { DishRecord } from "../../../models/Dish";
import { GroupRecord } from "../../../models/Group";
import { OrderRecord } from "../../../models/Order";

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
            badge: 'test',
            name: "1-name",
            description: "string",
            concept: [],
            condition:  (arg: GroupRecord | DishRecord | OrderRecord): boolean => {
                if (findModelInstanceByAttributes(arg) === "Order" && someInArray(arg.concept, discountEx.concept)) {
                    // Order.populate()
                    return true;
                }
                
                if (findModelInstanceByAttributes(arg) === "Dish" && someInArray(arg.concept, discountEx.concept)) {
                    // TODO: check if includes in IconfigDish
                    return true;
                }
                
                if (findModelInstanceByAttributes(arg) === "Group" && someInArray(arg.concept, discountEx.concept)) {
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
            displayGroup:  function (group: GroupRecord, user?: string): GroupRecord {
                if (this.isJoint === true && this.isPublic === true) {
                
                  group.discountAmount = promotionAdapter.promotions[this.id].configDiscount.discountAmount;
                  group.discountType = promotionAdapter.promotions[this.id].configDiscount.discountType;
                 }
                 
                return group
              },
              displayDish: function (dish: DishRecord, user?: string): DishRecord {
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
