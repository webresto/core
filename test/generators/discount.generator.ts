import * as faker from "faker";
import Group from './../../models/Group';
import Dish  from './../../models/Dish';
import Order from './../../models/Order';
import { PromotionAdapter } from "../../adapters/promotion/default/promotionAdapter";
import findModelInstanceByAttributes from "../../libs/findModelInstance";
import AbstractPromotionHandler from "../../adapters/promotion/AbstractPromotion";

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
  condition: function (arg1: Group | Dish | Order): boolean {
    throw new Error("Function not implemented.");
  },
  action: function (order: Order): Promise<void> {
    throw new Error("Function not implemented.");
  }
}): AbstractPromotionHandler {
  autoincrement++;
  return {
    id: config.id || faker.random.uuid(),
    description: faker.random.words(25),
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
      dishes: [],
      groups: [],
      excludeModifiers: false
  },
    // productCategoryDiscounts: undefined,
    condition: function (arg: Group | Dish | Order): boolean {
      if (findModelInstanceByAttributes(arg) === "Order" && this.concept.includes(arg.concept)) {
        // Order.populate()
        return true;
    }
    
    if (findModelInstanceByAttributes(arg) === "Dish" && this.concept.includes(arg.concept)) {
        // TODO: check if includes in IconfigDish
        return true;
    }
    
    if (findModelInstanceByAttributes(arg) === "Group" && this.concept.includes(arg.concept)) {
         // TODO: check if includes in IconfigG
        return true;
    }
    
    return false
  },
    action: async function (order: Order):Promise<void> {
         await PromotionAdapter.applyPromotion(order.id, this.configDiscount, this.id)
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
