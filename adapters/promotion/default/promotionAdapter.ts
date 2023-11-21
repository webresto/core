import Decimal from "decimal.js";
import Order, { PromotionState } from "../../../models/Order";
import AbstractPromotionHandler from "../AbstractPromotion";
import AbstractPromotionAdapter from "../AbstractPromotionAdapter";
import { WorkTimeValidator } from "@webresto/worktime";
import { IconfigDiscount } from "../../../interfaces/ConfigDiscount";
import Promotion from "../../../models/Promotion";
import Group from "../../../models/Group";
import Dish from "../../../models/Dish";
import ConfiguredPromotion from "./configuredPromotion";
import findModelInstanceByAttributes from "../../../libs/findModelInstance";
import PromotionCode from "../../../models/PromotionCode";

export class PromotionAdapter extends AbstractPromotionAdapter {

  public readonly promotions: { [key: string]: AbstractPromotionHandler; } = {};

  public async processOrder(populatedOrder: Order): Promise<Order> {
    const promotionStates = [] as PromotionState[]
    populatedOrder = await this.clearOfPromotion(populatedOrder);
    let filteredPromotion = this.filterByConcept(populatedOrder.concept);
    let promotionByConcept: Promotion[] | undefined = this.filterPromotions(filteredPromotion, populatedOrder);
    if (promotionByConcept[0] !== undefined) {
      for (const promotion of promotionByConcept) {
        let state = await this.promotions[promotion.id].action(populatedOrder);
        promotionStates.push(state);
      }
    }

    /**
     * The main idea is not to count discounts in the promotion handler, but only to assign them
    */

    // --- CALCULATE DISCOUNTS START --- //

    // TODO: Here need calculate discount total from all promotion handlers
    if (populatedOrder.promotionFlatDiscount > 0) {
      populatedOrder.discountTotal = new Decimal(populatedOrder.discountTotal).plus(populatedOrder.promotionFlatDiscount).toNumber();
    }

    // --- CALCULATE DISCOUNTS END --- //

    populatedOrder.promotionState = promotionStates;

    // populatedOrder = await Order.findOne(populatedOrder.id) 
    return populatedOrder
  }

  // one method to get all promotions and id's
  public displayDish(dish: Dish): Dish {
    try {
      let filteredPromotion = this.filterByConcept(dish.concept);
      let promotionByConcept: Promotion[] | undefined = this.filterPromotions(filteredPromotion, dish);

      if (promotionByConcept[0] === undefined) return dish;

      // TODO: this should work on first condition isJoint and isPublic should be true
      console.log(dish, "dish")
      console.log(this.promotions[promotionByConcept[0].id].displayDish(dish), "this.promotions[promotionByConcept[0].id].displayDish(dish)")
      return this.promotions[promotionByConcept[0].id].displayDish(dish)
    } catch (error) {

      sails.log.error("Promotion Adapter display Dish error", error);
    }
  }

  public displayGroup(group: Group): Group {
    // check isJoint = true, isPublic = true
    let filteredPromotion = this.filterByConcept(group.concept);
    let promotionByConcept: Promotion[] | undefined = this.filterPromotions(filteredPromotion, group);

    if (promotionByConcept[0] === undefined) return group;
    // TODO: this should work on first condition isJoint and isPublic should be true
    if (promotionByConcept[0]?.isJoint === true && promotionByConcept[0]?.isPublic === true) {
      group.discountAmount = this.promotions[promotionByConcept[0].id].configDiscount.discountAmount;
      group.discountType = this.promotions[promotionByConcept[0].id].configDiscount.discountType;
      return group
    }
    return group;
  }

  public filterByConcept(concept: string): Promotion[] {
    let modifiedConcept: string[];
    typeof concept === "string" ? (modifiedConcept = [concept]) : (modifiedConcept = concept);
    return Promotion.getAllByConcept(modifiedConcept);
  }

  public filterPromotions(promotionsByConcept: Promotion[], target: Group | Dish | Order): Promotion[] {
    /**
     * If promotion enabled by promocode notJoint it will be disable all promotions and set promocode promotion
     * If promocode promotion is joint it just will be applied by order
     */

    let filteredPromotionsToApply: Promotion[] = Object.values(promotionsByConcept)
      .filter((record) => {
        if (!record.worktime) return true;
        try {
          return WorkTimeValidator.isWorkNow({ worktime: record.worktime }).workNow;
        } catch (error) {
          sails.log.error("Promotion > helper > error: ", error);
        }
      })
      .sort((a, b) => a.sortOrder - b.sortOrder);

    const filteredByCondition: Promotion[] = this.filterByCondition(filteredPromotionsToApply, target);
    // Promotion by PromotionCode not need filtred
    if (findModelInstanceByAttributes(target) === "Order") {
      const order = target as Order;
      if (order.promotionCode) {
        const promotionCode = order.promotionCode as PromotionCode
        if (promotionCode.promotion.length) {
          (promotionCode.promotion as Promotion[]).forEach((p) => {
            p.sortOrder = -Infinity;
            filteredByCondition.push(p)
          });
        }
      }
    }
    // return first isJoint = false
    let filteredByJointPromotions: Promotion[] = [
      filteredByCondition.find((promotion) => {
        return promotion.isJoint === false;
      }),
    ];

    // return all isJoint = true
    if (!filteredByJointPromotions[0]) {
      filteredByJointPromotions = filteredByCondition.filter((promotion) => {
        return promotion.isJoint === true;
      });
    }
    return filteredByJointPromotions;
  }

  public filterByCondition(promotionsToCheck: Promotion[], target: Group | Dish | Order): Promotion[] {
    const filteredPromotions = [];
    for (const promotion of promotionsToCheck) {
      if (this.promotions[promotion.id]) {
        const conditionMet = this.promotions[promotion.id].condition(target);

        if (conditionMet) {
          filteredPromotions.push(promotion);
        }
      }
    }

    return filteredPromotions;
  }

  /**
   * Method uses for puntime call/pass promotionHandler, not configured 
   * @param promotionToAdd 
   */
  public async addPromotionHandler(promotionToAdd: AbstractPromotionHandler): Promise<void> {
    let createInModelPromotion: Promotion = {
      badge: promotionToAdd.badge,
      id: promotionToAdd.id,
      isJoint: promotionToAdd.isJoint,
      name: promotionToAdd.name,
      isPublic: promotionToAdd.isPublic,
      isDeleted: false,
      createdByUser: false,
      ...(promotionToAdd.description && { description: promotionToAdd.description }),
      ...(promotionToAdd.concept && { concept: promotionToAdd.concept }),
      configDiscount: promotionToAdd.configDiscount,
      sortOrder: 0,
      externalId: promotionToAdd.externalId,
      worktime: null, // promotionToAdd.worktime
    };

    await Promotion.createOrUpdate(createInModelPromotion);
    this.promotions[promotionToAdd.id] = promotionToAdd;
  }

  /**
   * Method uses for call from Promotion model, afterCreate/update for update configuredPromotion
   * @param promotionToAdd 
   * @returns 
   */
  public recreateConfiguredPromotionHandler(promotionToAdd: Promotion): void {
    if (promotionToAdd.enable === false && this.promotions[promotionToAdd.id]) {
      delete this.promotions[promotionToAdd.id]
      return
    }

    try {
      if (!this.promotions[promotionToAdd.id]) {
        this.promotions[promotionToAdd.id] = new ConfiguredPromotion(promotionToAdd, promotionToAdd.configDiscount);
        return
      }
      return
    } catch (e) {
      sails.log.error("recreateConfiguredPromotionHandler", e)

    }

    return
  }

  public getPromotionHandlerById(id: string): AbstractPromotionHandler | undefined {
    // let disc: AbstractDiscountHandler = await Discount.getById(id);
    return this.promotions[id];
  }

  public deletePromotion(id: string): void {
    delete this.promotions[id];
    return
  }

  /**
   * delete all promotions
   */
  public deleteAllPromotions(): void {
    for (const promotion in this.promotions) {
      delete this.promotions[promotion];
    }
  }

  public deletePromotionByBadge(badge: string): void {
    for (const promotion in this.promotions) {
      if (this.promotions[promotion].badge === badge) {
        delete this.promotions[promotion];
      }
    }
  }

  public getActivePromotionsIds(): string[] {
    return Object.keys(this.promotions);
  }
}
