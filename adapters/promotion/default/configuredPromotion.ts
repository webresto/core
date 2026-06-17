// import { WorkTime } from "@webresto/worktime";
import AbstractPromotionHandler from "../AbstractPromotion";
import { IconfigDiscount } from "../../../interfaces/ConfigDiscount";
import findModelInstanceByAttributes from "../../../libs/findModelInstance";
import Decimal from "decimal.js";
import { someInArray } from "../../../libs/stringsInArray";
import { GroupRecord } from "../../../models/Group";
import { DishRecord } from "../../../models/Dish";
import { OrderRecord, PromotionState } from "../../../models/Order";
import { OrderDishRecord } from "../../../models/OrderDish";
import { UserRecord } from "../../../models/User";

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

  public condition(arg: GroupRecord | DishRecord | OrderRecord, viaPromocode: boolean = false): boolean {
    /**
     * Promocode mode: the code is an explicit activation, so we don't require the
     * automatic dish/group targeting. We only enforce code-eligibility rules — the
     * minimum basket total.
     *
     * Threshold precedence (NOT max — first defined wins):
     *   gift.minBasketTotal  ??  config.minBasketTotal (top-level)  ??  0
     * i.e. for a gift promotion the gift threshold takes precedence and the generic
     * top-level one is ignored; 0 means "no threshold" (applies on any basket).
     *
     * The check gates the WHOLE promotion: returning false keeps it out of the apply
     * list, so below the threshold NEITHER the gift NOR any discount in the same
     * config is applied (and clearOfPromotion already removed any previously added
     * gift). Re-evaluated on every cart recount → dynamic.
     */
    if (viaPromocode && findModelInstanceByAttributes(arg) === "Order") {
      const order = arg as OrderRecord;
      const minBasketTotal = this.config.gift?.minBasketTotal ?? this.config.minBasketTotal ?? 0;
      return new Decimal(order.basketTotal ?? 0).gte(minBasketTotal);
    }

    if (
      findModelInstanceByAttributes(arg) === "Order" && 
      (this.concept[0] === undefined || this.concept[0] === "") ? 
        true : someInArray(arg.concept, this.concept)
      ) {


      let order: OrderRecord = arg as OrderRecord



      // TODO:  if order.dishes type number[]
      let orderDishes: OrderDishRecord[] = order.dishes as OrderDishRecord[]

      // Gift-only promotions may have no dishes/groups — guard against null so
      // condition() returns false cleanly instead of throwing (which would
      // silently abort the whole promotion batch in processOrder).
      const configDishes = this.config.dishes ?? []
      const configGroups = this.config.groups ?? []
      let checkDishes = orderDishes.map(order => order.dish).some((dish: DishRecord) => configDishes.includes(dish.id)) || configDishes.includes("*")
      let checkGroups = orderDishes.map(order => order.dish).some((dish: DishRecord) => configGroups.includes(dish.parentGroup)) || configGroups.includes("*")
      
      if (checkDishes || checkGroups) {
        if(this.config.deliveryMethod && Array.isArray(this.config.deliveryMethod)) {
          if(order.selfService) {
            if(!this.config.deliveryMethod.includes("selfService")) {
              return false
            }
          } else {
            if(!this.config.deliveryMethod.includes("delivery")) {
              return false
            }
          }
        }
        return true
      }

      return false;
    }

    if (findModelInstanceByAttributes(arg) === "Dish" && (this.concept[0] === undefined || this.concept[0] === "") ? true :
      someInArray(arg.concept, this.concept)) {
      return someInArray(arg.id, this.config.dishes ?? [])
    }

    if (findModelInstanceByAttributes(arg) === "Group" && (this.concept[0] === undefined || this.concept[0] === "") ? true :
      someInArray(arg.concept, this.concept)) {
      return someInArray(arg.id, this.config.groups ?? [])
    }



    return false
  }

  public async action(order: OrderRecord): Promise<PromotionState> {
    let mass: PromotionState = await this.applyPromotion(order)
    return mass
  }

  public displayGroup(group: GroupRecord, user?: string | UserRecord): GroupRecord {
    // TODO: user implement logic personal discount
    if (this.isJoint === true && this.isPublic === true) {
      // 
      group.discountAmount = Adapter.getPromotionAdapter().promotions[this.id].configDiscount.discountAmount;
      group.discountType = Adapter.getPromotionAdapter().promotions[this.id].configDiscount.discountType;
    }

    return group
  }

  public displayDish(dish: DishRecord, user?: string | UserRecord): DishRecord {
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
  public async applyPromotion(order: OrderRecord): Promise<PromotionState> {
    sails.log.debug(`Configured promotion to be applied. name: [${this.name}], id: [${this.id}]`)

    /**
     * GIFT: auto-add gift dishes for free when the basket reaches the threshold.
     *
     * clearOfPromotion (runs before every action in processOrder) already removed
     * any previously added gift dishes, so this re-evaluation is idempotent and a
     * basket that drops below `minBasketTotal` loses the gift automatically.
     *
     * basketTotal counts only user dishes (addedBy:"user"), so the gift itself does
     * not inflate the threshold check. addDish(addedBy:"promotion") goes through
     * countCart(isPromoting=true) → no recursive promotion processing.
     *
     * Second layer: condition(order, viaPromocode=true) already gates this via the
     * adapter. This guard checks ONLY gift.minBasketTotal (the top-level
     * config.minBasketTotal is irrelevant to adding a gift) and exists for direct
     * applyPromotion() calls by custom handlers that bypass the adapter/condition.
     */
    if (this.config.gift && Array.isArray(this.config.gift.dishes) && this.config.gift.dishes.length) {
      const minBasketTotal = this.config.gift.minBasketTotal ?? 0;
      if (new Decimal(order.basketTotal ?? 0).gte(minBasketTotal)) {
        for (const giftDish of this.config.gift.dishes) {
          if (!giftDish?.dishId) continue;
          try {
            await Order.addDish({ id: order.id }, giftDish.dishId, giftDish.amount ?? 1, [], "", "promotion");
          } catch (error) {
            sails.log.error(`ConfiguredPromotion gift: failed to add gift dish [${giftDish.dishId}] for promotion name: [${this.name}], id: [${this.id}]`, error);
          }
        }
      }
    }

    // order.dishes
    const orderDishes = await OrderDish.find({ order: order.id, addedBy: "user" }).populate("dish");
    let calculatedDiscountAmount: Decimal = new Decimal(0);

    /**
     * Gift-only promotions carry no discountType — skip the discount math entirely,
     * otherwise the cart-wide branch dereferences this.config.dishes/discountAmount
     * and the per-dish branch throws "Unknown discountType".
     */
    if (this.configDiscount?.discountType) {

    // Discount that applies to all dishes
    if (!this.config.dishes.length && !this.config.groups.length && !this.config.exclude?.dishes?.length && !this.config.exclude?.groups?.length) {
      if (this.configDiscount.discountType === "percentage") {
        calculatedDiscountAmount = new Decimal(order.basketTotal)
          .mul(+this.configDiscount.discountAmount / 100);
      // This is the case when a discount is set on the general receipt
      } else {
        calculatedDiscountAmount = new Decimal(this.configDiscount.discountAmount ?? this.config.discountAmount)
      }

    // If groups and dishes are selected for the discount
    } else {
      for (let orderDish of orderDishes) {

        let discountAmount: number;


        if (typeof orderDish.dish === "string") {
          throw new Error("Type error dish: applyPromotion expected array")
        }

        // Allowed only one 
        if (orderDish.discountId) {
          sails.log.warn(`orderDish with id [${orderDish.id}] was called to apply a discount on top of another discount. Please note that the discount did not apply`)
          continue;
        }

        if (!orderDish.dish) {
          sails.log.error("orderDish", orderDish.id, "has no such dish");
          continue;
        }

        if ((this.concept[0] === undefined || this.concept[0] === "") ?
          false : !someInArray(orderDish.dish.concept, this.concept)) {
          continue;
        }

        let excludeDishes = this.config.exclude?.dishes || []
        let excludeGroups = this.config.exclude?.groups || []

        if(excludeDishes.includes(orderDish.dish.id)) continue
        if(excludeGroups.includes(orderDish.dish.parentGroup)) continue

        let checkDishes = someInArray(orderDish.dish.id, this.config.dishes) || this.config.dishes.includes("*")
        let checkGroups = someInArray(orderDish.dish.parentGroup, this.config.groups) || this.config.groups.includes("*")



        if (!checkDishes || !checkGroups) continue

        let itemTotalBeforeDiscount = orderDish.itemTotal;
        
        let orderDishDiscountCost: number = 0;
        if (this.configDiscount.discountType === "flat") {
          discountAmount = this.configDiscount.discountAmount;
          orderDishDiscountCost = new Decimal(this.configDiscount.discountAmount).mul(orderDish.amount).toNumber();
          calculatedDiscountAmount = new Decimal(orderDishDiscountCost).add(calculatedDiscountAmount);

        } else if (this.configDiscount.discountType === "percentage") {
          // let discountPrice:number = new Decimal(orderDish.dish.price).mul(orderDish.amount).mul(+this.configDiscount.discountAmount / 100).toNumber();
          let orderDishDiscountItemCost = new Decimal(orderDish.dish.price).mul(this.configDiscount.discountAmount).mul(0.01)
          orderDishDiscountCost = orderDishDiscountItemCost.mul(orderDish.amount).toNumber();
          discountAmount = orderDishDiscountItemCost.toNumber();
          calculatedDiscountAmount = new Decimal(orderDishDiscountCost).add(calculatedDiscountAmount);
        
        } else {
          throw `Unknown discountType: [${this.configDiscount.discountType}] in name: [${this.name}], id: [${this.id}]`
        }
        let discountTotal: number = new Decimal(orderDish.discountTotal).add(orderDishDiscountCost).toNumber();
        const update =  { 
          itemTotalBeforeDiscount, 
          discountTotal, 
          discountType: this.configDiscount.discountType, 
          discountAmount, 
          discountId: this.id, 
          discountDebugInfo: orderDish.discountDebugInfo + `${new Date()}: name[${this.name}], id[${this.id}]`
        }
        await OrderDish.update({ id: orderDish.id },update).fetch();
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

    // TODO: this is call in ORM unwanted, but without this the direct call to the cart discount does not work
    await Order.updateOne({id: order.id}, {promotionFlatDiscount: order.promotionFlatDiscount});

    } // end discount calc guard (this.configDiscount.discountType)

    return {
      message: `${this.description}`,
      type: "configured-promotion",
      state: {
        config: this.config
      }
    }

  }

}
