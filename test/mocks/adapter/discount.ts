import AbstractPromotionHandler from "../../../adapters/promotion/AbstractPromotion";
import { IconfigDiscount } from './../../../interfaces/ConfigDiscount';
import findModelInstanceByAttributes from "../../../libs/findModelInstance";
import { someInArray } from "../../../libs/stringsInArray";
import ConfiguredPromotion from "../../../adapters/promotion/default/configuredPromotion";
import Decimal from "decimal.js";
import { GroupRecord } from "../../../models/Group";
import { DishRecord } from "../../../models/Dish";
import { OrderRecord, PromotionState } from "../../../models/Order";

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

    public condition(arg: GroupRecord | DishRecord | OrderRecord): boolean {
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

    public async action(order: OrderRecord): Promise<PromotionState> {
        let configuredPromotion: ConfiguredPromotion = new ConfiguredPromotion(this, this.configDiscount)
        await configuredPromotion.applyPromotion(order)
        return {
            message: "test",
            type: "test",
            state: {}
          }  
    }
    
    public displayGroup(group: GroupRecord, user?: string): GroupRecord {
        if (this.isJoint === true && this.isPublic === true) {
          
            group.discountAmount = Adapter.getPromotionAdapter().promotions[this.id].configDiscount.discountAmount;
            group.discountType = Adapter.getPromotionAdapter().promotions[this.id].configDiscount.discountType;
           }
           
          return group
    }

    public displayDish(dish: DishRecord, user?: string): DishRecord {
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
