// import { WorkTime } from "@webresto/worktime";
import AbstractPromotionHandler from "../AbstractPromotion";
import { IconfigDiscount } from "../../../interfaces/ConfigDiscount";
import Group from '../../../models/Group';
import Dish from '../../../models/Dish';
import OrderDish from '../../../models/OrderDish';
import Order, { PromotionState } from '../../../models/Order';
import User from '../../../models/User';
import findModelInstanceByAttributes from "../../../libs/findModelInstance";
import Decimal from "decimal.js";
import { someInArray, someInArray } from "../../../libs/someInArray";

export default class ConfiguredPromotion extends AbstractPromotionHandler {
  public badge: string = 'configured-promotion';
  constructor(promotion: Omit<AbstractPromotionHandler, "action" | "condition">, config?: IconfigDiscount) {
    super();
    if (config === undefined) {
      throw new Error("ConfiguredPromotion: Config not defined")
    }


    // if ((config.dishes.length + config.groups.length) === 0
    //   || !config.discountType || !config.discountAmount) {
    //   throw new Error("ConfiguredPromotion: bad config")
    // }

    this.config = config
    this.id = promotion.id,
    this.isJoint = promotion.isJoint,
    this.name = promotion.name,
    this.isPublic = promotion.isPublic;
    this.description = promotion.description;
    this.concept = promotion.concept;
    this.configDiscount = promotion.configDiscount;
    this.externalId = promotion.externalId
  }

  private config = {} as IconfigDiscount;
  public id: string;
  public isJoint: boolean;
  public name: string;
  public isPublic: boolean;
  public description: string;
  public concept: string[];
  // Look core/adapters/promotion/AbstractPromotion.ts 26L todo
  // public configDiscount: IconfigDiscount;
  public externalId: string;

  public condition(arg: Group | Dish | Order): boolean {
    if (findModelInstanceByAttributes(arg) === "Order" && (this.concept[0] === undefined || this.concept[0] === "")
      ? true : someInArray(arg.concept, this.concept)) {
      let order: Order = arg as Order
      // TODO:  if order.dishes type number[]
      let orderDishes: OrderDish[] = order.dishes as OrderDish[]

      let checkDishes = orderDishes.map(order => order.dish).some((dish: Dish) => this.config.dishes.includes(dish.id))
      let checkGroups = orderDishes.map(order => order.dish).some((dish: Dish) => this.config.groups.includes(dish.parentGroup))

      if (checkDishes && checkGroups) return true

      return false;
    }

    if (findModelInstanceByAttributes(arg) === "Dish" && (this.concept[0] === undefined || this.concept[0] === "") ? true :
      someInArray(arg.concept, this.concept)) {
      return someInArray(arg.id, this.config.dishes)
    }

    if (findModelInstanceByAttributes(arg) === "Group" && (this.concept[0] === undefined || this.concept[0] === "") ? true :
      someInArray(arg.concept, this.concept)) {
      return someInArray(arg.id, this.config.groups)
    }

    return false
  }

  public async action(order: Order): Promise<PromotionState> {
    let mass: PromotionState = await this.applyPromotion(order)
    return mass
  }

  public displayGroup(group: Group, user?: string | User): Group {
    // TODO: user implement logic personal discount
    if (this.isJoint === true && this.isPublic === true) {
      // 
      group.discountAmount = Adapter.getPromotionAdapter().promotions[this.id].configDiscount.discountAmount;
      group.discountType = Adapter.getPromotionAdapter().promotions[this.id].configDiscount.discountType;
    }

    return group
  }

  public displayDish(dish: Dish, user?: string | User): Dish {
    // TODO: user implement logic personal discount

    if (this.isJoint === true && this.isPublic === true) {
      // 
      dish.discountAmount = Adapter.getPromotionAdapter().promotions[this.id].configDiscount.discountAmount;
      dish.discountType = Adapter.getPromotionAdapter().promotions[this.id].configDiscount.discountType;
      dish.oldPrice = 123456 // TODO: delete it

      dish.salePrice = this.configDiscount.discountType === "flat"
        ? new Decimal(dish.price).minus(+this.configDiscount.discountAmount).toNumber()
        : new Decimal(dish.price)
          .mul(+this.configDiscount.discountAmount / 100)
          .toNumber()

    }

    return dish
  }

  // TODO: rewrite for argument (modificable Order);
  public async applyPromotion(order: Order): Promise<PromotionState> {
    sails.log.debug(`Configured promotion to be applied. name: [${this.name}], id: [${this.id}]`)

    // order.dishes
    const orderDishes = await OrderDish.find({ order: order.id, addedBy: "user" }).populate("dish");
    let calculatedDiscountAmount: Decimal = new Decimal(0);

    if (!this.config.dishes.length && !this.config.groups.length) {
      if (this.configDiscount.discountType === "percentage") {
        calculatedDiscountAmount = new Decimal(order.basketTotal)
          .mul(+this.configDiscount.discountAmount / 100);
      } else {
        calculatedDiscountAmount = new Decimal(this.configDiscount.discountAmount ?? this.config.promotionFlatDiscount)
      }
    } else {
      for (const orderDish of orderDishes) {

        if (typeof orderDish.dish === "string") {
          throw new Error("Type error dish: applyPromotion")
        }

        let orderDishDiscountCost: number = 0;
        if (!orderDish.dish) {
          sails.log.error("orderDish", orderDish.id, "has no such dish");
          continue;
        }

        if ((this.concept[0] === undefined || this.concept[0] === "") ?
          false : !someInArray(orderDish.dish.concept, this.concept)) {
          continue;
        }

        let checkDishes = someInArray(orderDish.dish.id, this.config.dishes)
        let checkGroups = someInArray(orderDish.dish.parentGroup, this.config.groups)

        if (!checkDishes || !checkGroups) continue

        if (this.configDiscount.discountType === "flat") {
          orderDishDiscountCost = new Decimal(this.configDiscount.discountAmount).mul(orderDish.amount).toNumber();
          calculatedDiscountAmount = new Decimal(orderDishDiscountCost).add(calculatedDiscountAmount);
          // calculatedDiscountAmount += new Decimal(orderDish.dish.price * orderDish.dish.amount).sub(this.configDiscount.discountAmount * orderDish.dish.amount ).toNumber();
        }

        if (this.configDiscount.discountType === "percentage") {
          // let discountPrice:number = new Decimal(orderDish.dish.price).mul(orderDish.amount).mul(+this.configDiscount.discountAmount / 100).toNumber();
          orderDishDiscountCost = new Decimal(orderDish.dish.price)
            .mul(orderDish.amount)
            .mul(+this.configDiscount.discountAmount / 100)
            .toNumber();
          calculatedDiscountAmount = new Decimal(orderDishDiscountCost).add(calculatedDiscountAmount);
        }

        let orderDishDiscount: number = new Decimal(orderDish.discountTotal).add(orderDishDiscountCost).toNumber();
        await OrderDish.update({ id: orderDish.id }, { discountTotal: orderDishDiscount, discountType: this.configDiscount.discountType }).fetch();
      }
    }

    /**
     * Since there can be several promotions, they may already contain promotionFlatDiscount
     */
    if(order.promotionFlatDiscount > 0){
      order.promotionFlatDiscount =  new Decimal(order.promotionFlatDiscount).plus(calculatedDiscountAmount).toNumber();      
    } else {
      order.promotionFlatDiscount = calculatedDiscountAmount.toNumber();
    }

    // TODO: this is call in ORM unwanted
    // await Order.updateOne({id: order.id}, {promotionFlatDiscount: order.promotionFlatDiscount});

    return {
      message: `${this.description}`,
      type: "configured-promotion",
      state: {
        config: this.config
      }
    }

  }

}
