import Decimal from "decimal.js";
import AbstractPromotionAdapter, { AbstractPromotionHandler } from "../PromotionAdapter";
import { openByHours } from "../../../lib/hours";
import ConfiguredPromotion from "./configuredPromotion";
import findModelInstanceByAttributes from "../../../lib/findModelInstance";
import { OrderRecord, PromotionState } from "../../../models/Order";
import { PromotionRecord } from "../../../models/Promotion";
import { DishRecord } from "../../../models/Dish";
import { GroupRecord } from "../../../models/Group";
import { PromotionCodeRecord } from "../../../models/PromotionCode";

/** `PromotionState.type` of a code's promotion waiting for a bigger basket: `state` - `{ promotionId, minBasketTotal, basketTotal }` */
const PROMOCODE_MIN_BASKET_TOTAL = "promocode-min-basket-total";

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
    promotionStates.push(...this.codeWaitsForBasket(populatedOrder, promotionByConcept));
    populatedOrder.promotionState = promotionStates;
    populatedOrder.promotionErrors = promotionErrors;

    // populatedOrder = await Order.findOne(populatedOrder.id)
    emitter.emit("promotion-process:debug", debugCount, populatedOrder, null, null);
    return populatedOrder
  }

  /**
   * The dish with `salePrice`, `discountAmount` and `discountType` of the
   * promotion that would discount a line of it, or all three `null`.
   *
   * The one the basket would apply, not the most generous: the candidates are
   * picked by the rule `processOrder` uses (one that is not joint alone, else
   * the joint ones by `sortOrder`), and the first of them takes the line — the
   * others skip a line that already has a discount. That one decides what is
   * shown; one the customer is not told about shows nothing.
   */
  public displayDish(dish: DishRecord): DishRecord {
    dish.salePrice = null;
    dish.discountAmount = null;
    dish.discountType = null;
    try {
      const [promotion] = this.filterPromotions(this.filterByConcept(dish.concept), dish);
      const handler = promotion ? this.promotions[promotion.id] : undefined;
      return handler?.displayDish ? handler.displayDish(dish) : dish;
    } catch (error) {
      sails.log.error("Promotion Adapter display Dish error", error);
      return dish;
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

  /**
   * The promotions of the order's code that wait for a bigger basket: below its `codeMinBasketTotal` a code's
   * promotion gives nothing, and the state says from which sum - a storefront tells the customer how much is
   * missing instead of showing a code that does nothing.
   */
  private codeWaitsForBasket(order: OrderRecord, applied: PromotionRecord[]): PromotionState[] {
    const promotionCode = order.promotionCode as PromotionCodeRecord | null;
    if (!promotionCode || !Array.isArray(promotionCode.promotion)) return [];
    const basketTotal = new Decimal(order.basketTotal ?? 0);
    return (promotionCode.promotion as PromotionRecord[]).flatMap((promotion) => {
      if (typeof promotion !== "object" || promotion === null) return [];
      if (applied.some((item) => item?.id === promotion.id)) return [];
      const handler = this.promotions[promotion.id];
      if (!(handler instanceof ConfiguredPromotion)) return [];
      const minBasketTotal = handler.codeMinBasketTotal;
      if (basketTotal.gte(minBasketTotal)) return [];
      return [{
        type: PROMOCODE_MIN_BASKET_TOTAL,
        message: `The promo code works from a basket total of ${minBasketTotal}`,
        state: { promotionId: promotion.id, minBasketTotal, basketTotal: basketTotal.toNumber() },
      }];
    });
  }

  public filterPromotions(promotionsByConcept: PromotionRecord[], target: GroupRecord | DishRecord | OrderRecord): PromotionRecord[] {
    /**
     * If promotion enabled by promocode notJoint it disables all promotions and sets promocode promotion,
     * If promocode promotion is joint, it just will be applied by order
     */

    let filteredPromotionsToApply: PromotionRecord[] = Object.values(promotionsByConcept)
      .filter((record) => openByHours(record.worktime))
      .sort((a, b) => a.sortOrder - b.sortOrder);

    const filteredByCondition: PromotionRecord[] = this.filterByCondition(filteredPromotionsToApply, target);
    /**
     * Promotions activated by an applied PromotionCode are force-applied, but they
     * still pass through condition() in promocode mode (viaPromocode=true): the code
     * relaxes the automatic dish/group targeting, yet code-eligibility rules (e.g. a
     * minimum basket total) are honoured. A promotion already eligible automatically
     * is not pushed twice.
     */
    if (findModelInstanceByAttributes(target) === "Order") {
      const order = target as OrderRecord;
      if (order.promotionCode) {
        const promotionCode = order.promotionCode as PromotionCodeRecord
        if (Array.isArray(promotionCode.promotion)) {
          promotionCode.promotion.forEach((p) => {
            if (typeof p !== "object" || p === null) return;
            const handler = this.promotions[p.id];
            if (!handler) return; // not registered (e.g. disabled) → can't apply
            if (filteredByCondition.some((x) => x.id === p.id)) return; // already eligible
            if (handler.condition(order, true)) {
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
