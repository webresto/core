// import { WorkTime } from "@webresto/worktime";
import AbstractPromotionHandler from "../AbstractPromotion";
import { IconfigDiscount } from "../../../interfaces/ConfigDiscount";
import { PromotionAdapter } from "./promotionAdapter";
import Group from '../../../models/Group';
import Dish from '../../../models/Dish';
import Order, { PromotionState } from '../../../models/Order';
import User from '../../../models/User';
import findModelInstanceByAttributes from "../../../libs/findModelInstance";
import Decimal from "decimal.js";
import { stringsInArray } from "../../../libs/stringsInArray";

export default class configuredPromotion extends AbstractPromotionHandler {
    constructor(promotion:AbstractPromotionHandler, config?: IconfigDiscount) {
        super();
        this.config = config
        this.id = promotion.id,
        this.isJoint = promotion.isJoint,
        this.name= promotion.name,
        this.isPublic= promotion.isPublic;
        this.description= promotion.description;
        this.concept= promotion.concept;
        this.configDiscount= promotion.configDiscount;
        this.externalId= promotion.externalId
    }

    private config = {} as IconfigDiscount;
    public id: string;
    public isJoint: boolean;
    public name: string;
    public isPublic: boolean;
    public description: string;
    public concept: string[];
    public configDiscount: IconfigDiscount;
    public externalId: string;

    public  condition(arg: Group | Dish | Order): boolean {
        if (findModelInstanceByAttributes(arg) === "Order" && stringsInArray(arg.concept, this.concept) ) {
            // order not used for configuredPromotion
            // Order.populate()
            console.log("condition")
            return true;
        }
        
        if (findModelInstanceByAttributes(arg) === "Dish" && stringsInArray(arg.concept, this.concept)) {
            if(this.config.dishes.includes(arg.id)){
                return true;
            }
        }
        
        if (findModelInstanceByAttributes(arg) === "Group" && stringsInArray(arg.concept, this.concept)) {
            if(this.config.groups.includes(arg.id)){
                return true;
            }
        }

        return false
    }
    
    public async action(order: Order): Promise<PromotionState> {
        console.log(this.config + "  action")
        let mass:PromotionState = await configuredPromotion.applyPromotion(order.id, this.config, this.id)
        return mass
    }
 
    public async displayGroup(group: Group, user?: string | User): Promise<Group[]> {
        if(user){
            //  return await Group.display(this.concept, group.id)
            return await Group.display(group)
        }
    }

    public async displayDish(dish: Dish, user?: string | User): Promise<Dish[]> {
        if(user){
            //  return await Dish.display(this.concept, group.id)
            return await Dish.display(dish)
        }
    }

    public static async applyPromotion(orderId, spendDiscount: IconfigDiscount, promotionId): Promise<PromotionState> {
        const order = await Order.findOne({ id: orderId });
    
        if (order.user && typeof order.user === "string") {
          const promotion = await Promotion.findOne({ id: promotionId });
          // order.dishes
          const orderDishes = await OrderDish.find({ order: order.id }).populate("dish");
          let discountCost: Decimal = new Decimal(0);
    
          for (const orderDish of orderDishes) {
            let orderDishDiscountCost: number = 0;
            if (!orderDish.dish) {
              sails.log.error("orderDish", orderDish.id, "has no such dish");
              continue;
            }
    
            if (!stringsInArray(orderDish.dish.concept, promotion.concept)) {
              continue;
            }
    
            // ------------------------------------------ Decimal ------------------------------------------
            if (spendDiscount.discountType === "flat") {
              orderDishDiscountCost = new Decimal(spendDiscount.discountAmount).mul(orderDish.amount).toNumber();
              discountCost = new Decimal(orderDishDiscountCost).add(discountCost);
              // discountCost += new Decimal(orderDish.dish.price * orderDish.dish.amount).sub(spendDiscount.discountAmount * orderDish.dish.amount ).toNumber();
            }
    
            if (spendDiscount.discountType === "percentage") {
              // let discountPrice:number = new Decimal(orderDish.dish.price).mul(orderDish.amount).mul(+spendDiscount.discountAmount / 100).toNumber();
              orderDishDiscountCost = new Decimal(orderDish.dish.price)
                .mul(orderDish.amount)
                .mul(+spendDiscount.discountAmount / 100)
                .toNumber();
              discountCost = new Decimal(orderDishDiscountCost).add(discountCost);
            }
    
            let orderDishDiscount: number = new Decimal(orderDish.discountTotal).add(orderDishDiscountCost).toNumber();
            await OrderDish.update({ id: orderDish.id }, { discountTotal: orderDishDiscount, discountType: spendDiscount.discountType }).fetch();
    
            // await OrderDish.update({ id: orderDish.id }, { discountTotal:  orderDishDiscountCost, discountType: spendDiscount.discountType}).fetch();
            // await OrderDish.update({ id: orderDish.id }, { amount: orderDish.dish.price, discount: discountCost}).fetch();
          }
          // Update the order with new total
          let orderDiscount: number = new Decimal(order.discountTotal).add(discountCost.toNumber()).toNumber();
          await Order.updateOne({ id: orderId }, { discountTotal: orderDiscount })
    
          // let discountCoverage: Decimal;
          // await Order.updateOne({id: orderId}, {total: order.total, discountTotal:  discountCoverage.toNumber()});
        } else {
          throw `User not found in Order, applyDiscount failed`;
        }
        return {
            message: `Configured promotion`,
            type: "configured-promotion",
            state: {}
        }  
      }
   
}
