import * as faker from "faker";
import Group from './../../models/Group';
import Dish  from './../../models/Dish';
import OrderDish  from './../../models/OrderDish';
import Order, { PromotionState } from './../../models/Order';
import { PromotionAdapter } from "../../adapters/promotion/default/promotionAdapter";
import findModelInstanceByAttributes from "../../libs/findModelInstance";
import AbstractPromotionHandler from "../../adapters/promotion/AbstractPromotion";
import ConfiguredPromotion from "../../adapters/promotion/default/configuredPromotion";
import { stringsInArray } from "../../libs/stringsInArray";

var autoincrement: number = 0;

export default function discountGenerator(config: AbstractPromotionHandler = {
  id: "",
  isJoint: true,
  name: "",
  isPublic: false,
  // enable: false,
  // isDeleted: false,
  // createdByUser: false,
  description: "",
  concept: [],
  configDiscount: undefined,
  // sortOrder: 0,
  // productCategoryDiscounts: undefined,
  externalId: "",
}): AbstractPromotionHandler {
  autoincrement++;
  return {
    id: config.id || faker.random.uuid(),
    description: "Discount generator description",
    // sortOrder: autoincrement,
    name: config.name || faker.commerce.productName(),
    // isDeleted: config.isDeleted || false,
    isJoint: config.isJoint || false,
    isPublic: false,
    // enable: config.enable || false,
    // createdByUser: config.createdByUser || false,
    concept: config.concept || [],
    configDiscount: config.configDiscount || {
      discountAmount: 1.33,
      discountType: "flat",
      dishes: ["a"],
      groups: ["a"],
      excludeModifiers: false
  },
    // productCategoryDiscounts: undefined,
    condition: function (arg: Group | Dish | Order): boolean {
      if (findModelInstanceByAttributes(arg) === "Order" && stringsInArray(arg.concept, this.concept)) {
        let order:Order = arg as Order
        // TODO:  if order.dishes type number[]
        let orderDishes:OrderDish[] = order.dishes as OrderDish[]

        let checkDishes = orderDishes.map(order =>order.dish).some(dish => this.configDiscount.dishes.includes(dish.id))
        let checkGroups = orderDishes.map(order =>order.dish).some(dish => this.configDiscount.groups.includes(dish.parentGroup))

        if(checkDishes && checkGroups) return true
        
        return false;
    }
    
    if (findModelInstanceByAttributes(arg) === "Dish" && stringsInArray(arg.concept, this.concept)) {
        // TODO: check if includes in IconfigDish
        return true;
    }
    
    if (findModelInstanceByAttributes(arg) === "Group" && stringsInArray(arg.concept, this.concept)) {
         // TODO: check if includes in IconfigG
        return true;
    }
    
    return false
  },
    action: async function (order: Order):Promise<PromotionState> {
      let configuredPromotion: ConfiguredPromotion = new ConfiguredPromotion(this, this.configDiscount)
      return await configuredPromotion.applyPromotion(order.id)

    },
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
    externalId: faker.random.uuid()
  };
}

// export let discountFields = ["id", "additionalInfo", "code", "description", "order", "images", "name", "isDeleted", "dishes"];
