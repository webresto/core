import { WorkTime } from "@webresto/worktime";
import Order, { PromotionState } from './../../../models/Order';
import AbstractPromotionHandler from "../../../adapters/promotion/AbstractPromotion";
import { IconfigDiscount } from './../../../interfaces/ConfigDiscount';
import Group from './../../../models/Group';
import Dish from './../../../models/Dish';
import findModelInstanceByAttributes from "../../../libs/findModelInstance";
import { PromotionAdapter } from './../../../adapters/promotion/default/promotionAdapter';
import { stringsInArray } from "../../../libs/stringsInArray";
import configuredPromotion from "../../../adapters/promotion/default/configuredPromotion";
import ConfiguredPromotion from "../../../adapters/promotion/default/configuredPromotion";

export class InMemoryDiscountAdapter extends AbstractPromotionHandler  {
    public id: string = "aaaa";
    public isJoint: boolean = true;
    public name: string = "New Year";
    public isPublic: boolean = false;
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
        if (findModelInstanceByAttributes(arg) === "Order" && stringsInArray(arg.concept, this.concept) ) {
            // order not used for configuredPromotion
            // Order.populate()
            // TODO: check if includes groups and dishes
           // where to get groups?
           

            return true;
        }
        
        if (findModelInstanceByAttributes(arg) === "Dish" && stringsInArray(arg.concept, this.concept)) {
            if(this.configDiscount.dishes.includes(arg.id)){
                return true;
            }
        }
        
        if (findModelInstanceByAttributes(arg) === "Group" && stringsInArray(arg.concept, this.concept)) {
            if(this.configDiscount.groups.includes(arg.id)){
                return true;
            }
        }

        return false
    }

    public async action(order: Order): Promise<PromotionState> {
        let configuredPromotion: ConfiguredPromotion = new ConfiguredPromotion(this, this.configDiscount)
        await configuredPromotion.applyPromotion(order.id)
        return {
            message: "test",
            type: "test",
            state: {}
          }  
    }
    
    public async displayGroup(group:Group, user?: string): Promise<Group[]> {
        // Implement the displayGroupDiscount method logic
        // Display the group discount
        // console.log("displayGroupDish")\
        throw new Error("Method not implemented.");
    }

    public async displayDish?(dish:Dish, user?: string): Promise<Dish[]> {
        throw new Error("Method not implemented.");
    }
    

}