import Decimal from "decimal.js";
import AbstractPromotionHandler from "../AbstractPromotion";
import AbstractPromotionAdapter from "../AbstractPromotionAdapter";
import { WorkTimeValidator } from "@webresto/worktime";
import ConfiguredPromotion from "./configuredPromotion";
import findModelInstanceByAttributes from "../../../libs/findModelInstance";
import { OrderRecord, PromotionState } from "../../../models/Order";
import { PromotionRecord } from "../../../models/Promotion";
import { DishRecord } from "../../../models/Dish";
import { GroupRecord } from "../../../models/Group";
import { PromotionCodeRecord } from "../../../models/PromotionCode";

export class PromotionAdapter extends AbstractPromotionAdapter {

  public readonly promotions: { [key: string]: AbstractPromotionHandler; } = {};

  public async processOrder(populatedOrder: OrderRecord): Promise<OrderRecord> {
    const promotionStates = [] as PromotionState[]
    const promotionErrors = [];
    let debugCount = 0;
    emitter.emit("promotion-process:debug", debugCount, populatedOrder, null, null)
    populatedOrder = await this.clearOfPromotion(populatedOrder);
    let filteredPromotion = this.filterByConcept(populatedOrder.concept);
    // TODO: filter retruns only one
    let promotionByConcept: PromotionRecord[] | undefined = this.filterPromotions(filteredPromotion, populatedOrder);
    if (promotionByConcept[0] !== undefined) {
      for (const promotion of promotionByConcept) {
        debugCount++;
        try {
          const state = await this.promotions[promotion.id].action(populatedOrder);
          promotionStates.push(state);
          emitter.emit("promotion-process:debug", debugCount, populatedOrder, promotion, state);
        } catch (error) {
          promotionErrors.push({
            promotion: promotion,
            error: error,
            stack: error.stack
          })
          emitter.emit("promotion-process:debug", debugCount, populatedOrder, promotion, error);
          sails.log.error(error)
        }
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
    populatedOrder.promotionErrors = promotionErrors;

    // populatedOrder = await Order.findOne(populatedOrder.id)
    emitter.emit("promotion-process:debug", debugCount, populatedOrder, null, null);
    return populatedOrder
  }

  // one method to get all promotions and id's
  public displayDish(dish: DishRecord): DishRecord {
    try {
      let filteredPromotion = this.filterByConcept(dish.concept);
      let promotionByConcept: PromotionRecord[] | undefined = this.filterPromotions(filteredPromotion, dish);

      if (promotionByConcept[0] === undefined) return dish;

      // TODO: this should work on first condition isJoint and isPublic should be true

      return this.promotions[promotionByConcept[0].id].displayDish(dish)
    } catch (error) {

      sails.log.error("Promotion Adapter display Dish error", error);
    }
  }

  public displayGroup(group: GroupRecord): GroupRecord {
    // check isJoint = true, isPublic = true
    let filteredPromotion = this.filterByConcept(group.concept);
    let promotionByConcept: PromotionRecord[] | undefined = this.filterPromotions(filteredPromotion, group);

    if (promotionByConcept[0] === undefined) return group;
    // TODO: this should work on first condition isJoint and isPublic should be true
    if (promotionByConcept[0]?.isJoint === true && promotionByConcept[0]?.isPublic === true) {
      group.discountAmount = this.promotions[promotionByConcept[0].id].configDiscount.discountAmount;
      group.discountType = this.promotions[promotionByConcept[0].id].configDiscount.discountType;
      return group
    }
    return group;
  }

  public filterByConcept(concept: string | string[]): PromotionRecord[] {
    let modifiedConcept: string[];
    typeof concept === "string" ? (modifiedConcept = [concept]) : (modifiedConcept = concept);
    return Promotion.getAllByConcept(modifiedConcept);
  }

  public filterPromotions(promotionsByConcept: PromotionRecord[], target: GroupRecord | DishRecord | OrderRecord): PromotionRecord[] {
    /**
     * If promotion enabled by promocode notJoint it disables all promotions and sets promocode promotion,
     * If promocode promotion is joint, it just will be applied by order
     */

    let filteredPromotionsToApply: PromotionRecord[] = Object.values(promotionsByConcept)
      .filter((record) => {
        if (!record.worktime) return true;
        try {
          //@ts-ignore
          return WorkTimeValidator.isWorkNow({ worktime: record.worktime }).workNow;
        } catch (error) {
          sails.log.error("Promotion > helper > error: ", error);
        }
      })
      .sort((a, b) => a.sortOrder - b.sortOrder);

    const filteredByCondition: PromotionRecord[] = this.filterByCondition(filteredPromotionsToApply, target);
    // Promotion by PromotionCode doesn't need to be filtered
    if (findModelInstanceByAttributes(target) === "Order") {
      const order = target as OrderRecord;
      if (order.promotionCode) {
        const promotionCode = order.promotionCode as PromotionCodeRecord
        if (Array.isArray(promotionCode.promotion)) {
          promotionCode.promotion.forEach((p) => {
            if(typeof p === "object") {
              p.sortOrder = -Infinity;
              filteredByCondition.push(p);
            }
          });
        }
        else {
          if (promotionCode.promotion !== null) {
            sails.log.debug(`PromotionAdapter: promotionCode.promotion should be array: \n${JSON.stringify(promotionCode, null, 2)}`);
          }
        }
      }
    }
    // return first isJoint = false
    let filteredByJointPromotions: PromotionRecord[] = [
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

  public filterByCondition(promotionsToCheck: PromotionRecord[], target: GroupRecord | DishRecord | OrderRecord): PromotionRecord[] {
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
   * Method uses for runtime call/pass promotionHandler, not configured
   * @param promotionToAdd
   */
  public async addPromotionHandler(promotionToAdd: AbstractPromotionHandler): Promise<void> {
    let createInModelPromotion: PromotionRecord = {
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
  public recreateConfiguredPromotionHandler(promotionToAdd: PromotionRecord): void {
    if (this.promotions[promotionToAdd.id]) {
      delete this.promotions[promotionToAdd.id]
    }

    if (promotionToAdd.enable !== false) {
      this.promotions[promotionToAdd.id] = new ConfiguredPromotion(promotionToAdd, promotionToAdd.configDiscount);
    }
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
