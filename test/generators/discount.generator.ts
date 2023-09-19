import faker from "faker";
import Group from './../../models/Group';
import Dish  from './../../models/Dish';
import OrderDish  from './../../models/OrderDish';
import Order, { PromotionState } from './../../models/Order';
import { PromotionAdapter } from "../../adapters/promotion/default/promotionAdapter";
import findModelInstanceByAttributes from "../../libs/findModelInstance";
import AbstractPromotionHandler from "../../adapters/promotion/AbstractPromotion";
import ConfiguredPromotion from "../../adapters/promotion/default/configuredPromotion";
import { stringsInArray } from "../../libs/stringsInArray";
import Decimal from "decimal.js";

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

        let checkDishes = orderDishes.map(order =>order.dish).some((dish:Dish) => this.configDiscount.dishes.includes(dish.id))
        let checkGroups = orderDishes.map(order =>order.dish).some((dish:Dish) => this.configDiscount.groups.includes(dish.parentGroup))

        if(checkDishes && checkGroups) return true
        
        return false;
    }
    
    if (findModelInstanceByAttributes(arg) === "Dish" && stringsInArray(arg.concept, this.concept)) {
      return stringsInArray(arg.id, this.configDiscount.dishes)
      // if(this.config.dishes.includes(arg.id)){
      //   return true;
      // }
    }
    
    if (findModelInstanceByAttributes(arg) === "Group" && stringsInArray(arg.concept, this.concept)) {
      return stringsInArray(arg.id, this.configDiscount.groups)
      // if(this.config.groups.includes(arg.id)){
      //   return true;
      // }
    }
    
    return false
  },
    action: async function (order: Order):Promise<PromotionState> {
      let configuredPromotion: ConfiguredPromotion = new ConfiguredPromotion(this, this.configDiscount)
      return await configuredPromotion.applyPromotion(order.id)

    },
    // sortOrder: 0,
    displayGroup: function (group:Group, user?: string): Group {
      if (this.isJoint === true && this.isPublic === true) {
        // 
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
    externalId: faker.random.uuid()
  };
}

// export let discountFields = ["id", "additionalInfo", "code", "description", "order", "images", "name", "isDeleted", "dishes"];
