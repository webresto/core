import { WorkTime } from "@webresto/worktime";
import Order, { PromotionState } from './../../../models/Order';
import AbstractPromotionHandler from "../../../adapters/promotion/AbstractPromotion";
import { IconfigDiscount } from './../../../interfaces/ConfigDiscount';
import Group from './../../../models/Group';
import Dish from './../../../models/Dish';
import findModelInstanceByAttributes from "../../../libs/findModelInstance";
import { someInArray } from "../../../libs/someInArray";
import configuredPromotion from "../../../adapters/promotion/default/configuredPromotion";
import ConfiguredPromotion from "../../../adapters/promotion/default/configuredPromotion";
import Decimal from "decimal.js";

export class InMemoryDiscountAdapter extends AbstractPromotionHandler  {
    public id: string = "InMemoryDiscountAdapterTest";
    public isJoint: boolean = true;
    public name: string = "New Year";
    public isPublic: boolean = false;
    public badge: string = "test";
    public description: string = "some text";
    public concept: string[] = ["NewYear", "Happy Birthday","origin","3dif"];
    public configDiscount: IconfigDiscount = {
        discountAmount: 10,
        discountType: "percentage",
        dishes: ["a"],
        groups: ["a"],
        excludeModifiers: false
    };
    // public sortOrder: number = 1;
    // public productCategoryDiscounts: any = {};
    public hash: string = "my-hash";
    public externalId: string = "my-external-id";
    // public worktime?: WorkTime[] = null;

    public condition(arg: Group | Dish | Order): boolean {
        // this.concept.includes(arg.concept)
        if (findModelInstanceByAttributes(arg) === "Order" && someInArray(arg.concept, this.concept) ) {
            // order not used for configuredPromotion
            // Order.populate()
            // TODO: check if includes groups and dishes
           // where to get groups?
           

            return true;
        }
        
        if (findModelInstanceByAttributes(arg) === "Dish" && someInArray(arg.concept, this.concept)) {
            if(this.configDiscount.dishes.includes(arg.id)){
                return true;
            }
        }
        
        if (findModelInstanceByAttributes(arg) === "Group" && someInArray(arg.concept, this.concept)) {
            if(this.configDiscount.groups.includes(arg.id)){
                return true;
            }
        }

        return false
    }

    public async action(order: Order): Promise<PromotionState> {
        let configuredPromotion: ConfiguredPromotion = new ConfiguredPromotion(this, this.configDiscount)
        await configuredPromotion.applyPromotion(order)
        return {
            message: "test",
            type: "test",
            state: {}
          }  
    }
    
    public displayGroup(group:Group, user?: string): Group {
        if (this.isJoint === true && this.isPublic === true) {
          
            group.discountAmount = Adapter.getPromotionAdapter().promotions[this.id].configDiscount.discountAmount;
            group.discountType = Adapter.getPromotionAdapter().promotions[this.id].configDiscount.discountType;
           }
           
          return group
    }

    public displayDish(dish:Dish, user?: string): Dish {
        if (this.isJoint === true && this.isPublic === true) {
            // 
            dish.discountAmount = Adapter.getPromotionAdapter().promotions[this.id].configDiscount.discountAmount;
            dish.discountType = Adapter.getPromotionAdapter().promotions[this.id].configDiscount.discountType;
            dish.oldPrice = dish.price
  
            dish.price = this.configDiscount.discountType === "flat" 
            ? new Decimal(dish.price).minus(+this.configDiscount.discountAmount).toNumber()
            : new Decimal(dish.price)
                .mul(+this.configDiscount.discountAmount / 100)
                .toNumber()  
          }
          return dish
    }
    

}
