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
import { PROMOCODE_MIN_BASKET_TOTAL, PROMOCODE_PROMOTION_HOURS, PROMOCODE_SERVICE_TYPE, PROMOCODE_SETS_ASIDE } from "../../../lib/promotion-code";

export class PromotionAdapter extends AbstractPromotionAdapter {

  public readonly promotions: { [key: string]: AbstractPromotionHandler; } = {};

  public async processOrder(populatedOrder: OrderRecord): Promise<OrderRecord> {
    const promotionStates = [] as PromotionState[]
    const promotionErrors = [];
    let debugCount = 0;
    emitter.emit("promotion-process:debug", debugCount, populatedOrder, null, null)
    populatedOrder = await this.clearOfPromotion(populatedOrder);
    const automatic = this.automaticPromotions(this.filterByConcept(populatedOrder.concept), populatedOrder);
    const byCode = this.codePromotions(populatedOrder);
    const promotionByConcept = this.choose(byCode, automatic);
    // the entries of the code's promotions say so: a storefront tells what the code gives from what a promotion gives by itself
    const ofCode = new Set(byCode.map((promotion) => promotion.id));
    if (promotionByConcept[0] !== undefined) {
      for (const promotion of promotionByConcept) {
        debugCount++;
        try {
          const state = await this.promotions[promotion.id].action(populatedOrder);
          promotionStates.push(ofCode.has(promotion.id) ? { ...state, byCode: true } : state);
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
    promotionStates.push(
      ...this.codeGivesNothing(populatedOrder, promotionByConcept),
      ...this.codeSetsAside(byCode, automatic, promotionByConcept),
    );
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
   * The promotions of the order's code that give nothing now, and why - a storefront tells the customer instead of
   * showing a code that does nothing: out of the promotion's hours, not for the way the order is received, below its
   * minimum basket (`codeMinBasketTotal`). One the code's exclusive promotion keeps out works, and says nothing.
   */
  private codeGivesNothing(order: OrderRecord, applied: PromotionRecord[]): PromotionState[] {
    const basketTotal = new Decimal(order.basketTotal ?? 0);
    return this.codeLinked(order).flatMap((promotion): PromotionState[] => {
      if (applied.some((item) => item?.id === promotion.id)) return [];
      const handler = this.promotions[promotion.id];
      if (!(handler instanceof ConfiguredPromotion)) return [];
      if (!openByHours(promotion.worktime)) {
        return [{ type: PROMOCODE_PROMOTION_HOURS, message: "The promo code does not work at this time", state: { promotionId: promotion.id }, byCode: true }];
      }
      if (!handler.servesOrder(order)) {
        const serviceTypes = handler.serviceTypes;
        return [{ type: PROMOCODE_SERVICE_TYPE, message: `The promo code works for ${serviceTypes.join(", ")} only`, state: { promotionId: promotion.id, serviceTypes }, byCode: true }];
      }
      const minBasketTotal = handler.codeMinBasketTotal;
      if (basketTotal.gte(minBasketTotal)) return [];
      return [{
        type: PROMOCODE_MIN_BASKET_TOTAL,
        message: `The promo code works from a basket total of ${minBasketTotal}`,
        state: { promotionId: promotion.id, minBasketTotal, basketTotal: basketTotal.toNumber() },
        byCode: true,
      }];
    });
  }

  /** The promotions the basket would have without its working code and has not with it: the code does not stack with them. */
  private codeSetsAside(byCode: PromotionRecord[], automatic: PromotionRecord[], applied: PromotionRecord[]): PromotionState[] {
    if (!byCode.length) return [];
    const aside = this.choose([], automatic).filter((promotion) => !applied.some((item) => item.id === promotion.id));
    if (!aside.length) return [];
    return [{
      type: PROMOCODE_SETS_ASIDE,
      message: `The promo code does not stack with: ${aside.map((promotion) => promotion.name).join(", ")}`,
      state: { promotions: aside.map(({ id, name, description }) => ({ id, name, description })) },
      byCode: true,
    }];
  }

  /**
   * The promotions to apply, in the order they take the lines: one that is not joint alone, else the joint ones.
   *
   * The applied code's promotions come first - the customer typed the code to have them. An exclusive one of them
   * takes the basket alone; joint ones go with the joint automatic promotions, and an exclusive automatic one gives
   * way to them. A code's promotion that does not work now (`codePromotions`) puts nothing aside.
   */
  public filterPromotions(promotionsByConcept: PromotionRecord[], target: GroupRecord | DishRecord | OrderRecord): PromotionRecord[] {
    const byCode = findModelInstanceByAttributes(target) === "Order" ? this.codePromotions(target as OrderRecord) : [];
    return this.choose(byCode, this.automaticPromotions(promotionsByConcept, target));
  }

  /** The promotions that apply to the target by themselves, within their hours, by `sortOrder`. */
  private automaticPromotions(promotionsByConcept: PromotionRecord[], target: GroupRecord | DishRecord | OrderRecord): PromotionRecord[] {
    const open = Object.values(promotionsByConcept)
      .filter((record) => openByHours(record.worktime))
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    return this.filterByCondition(open, target);
  }

  /** The rule of `filterPromotions` over the code's promotions that work and the automatic ones. */
  private choose(byCode: PromotionRecord[], automatic: PromotionRecord[]): PromotionRecord[] {
    const candidates = byCode.length
      ? [...byCode, ...automatic.filter((promotion) => promotion.isJoint === true && !byCode.some((own) => own.id === promotion.id))]
      : automatic;
    const exclusive = candidates.find((promotion) => promotion.isJoint === false);
    return exclusive ? [exclusive] : candidates.filter((promotion) => promotion.isJoint === true);
  }

  /**
   * The promotions of the order's code that work now, by their `sortOrder`. Switched off or not, a promotion applies
   * through its code, within its hours; the code relaxes its targeting of dishes and groups (`condition` in promocode
   * mode), the way the order is received and the minimum basket still hold.
   */
  private codePromotions(order: OrderRecord): PromotionRecord[] {
    return this.codeLinked(order)
      .filter((promotion) => openByHours(promotion.worktime) && this.promotions[promotion.id]?.condition(order, true))
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }

  /** The promotions the order's code is linked to. */
  private codeLinked(order: OrderRecord): PromotionRecord[] {
    const promotionCode = order.promotionCode as PromotionCodeRecord | null;
    if (!promotionCode || typeof promotionCode !== "object") return [];
    if (!Array.isArray(promotionCode.promotion)) {
      if (promotionCode.promotion !== null) {
        sails.log.debug(`PromotionAdapter: promotionCode.promotion should be array: \n${JSON.stringify(promotionCode, null, 2)}`);
      }
      return [];
    }
    return (promotionCode.promotion as PromotionRecord[]).filter((promotion) => typeof promotion === "object" && promotion !== null);
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
   * Called by the Promotion model after a configured promotion is created or updated. Switched off, it stays
   * registered: it no longer applies by itself (the baskets take only enabled ones, `Promotion.getAllByConcept`),
   * but still through its codes. A deleted one is dropped.
   */
  public recreateConfiguredPromotionHandler(promotionToAdd: PromotionRecord): void {
    if (this.promotions[promotionToAdd.id]) {
      delete this.promotions[promotionToAdd.id]
    }

    if (!promotionToAdd.isDeleted) {
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
