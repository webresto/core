import Decimal from "decimal.js";
import Order, { PromotionState } from "../../../models/Order";
import AbstractPromotionHandler from "../AbstractPromotion";
import AbstractPromotionAdapter from "../AbstractPromotionAdapter";
import configuredPromotion from "./configuredPromotion";
import { WorkTimeValidator } from "@webresto/worktime";
import { IconfigDiscount } from "../../../interfaces/ConfigDiscount";
import Promotion from "../../../models/Promotion";
import Group from "../../../models/Group";
import Dish from "../../../models/Dish";

export class PromotionAdapter extends AbstractPromotionAdapter {
  static promotions: { [key: string]: AbstractPromotionHandler } = {};
  
  public async processOrder(order: Order): Promise<PromotionState[]> {
    const promotionStates = [] as PromotionState[]
    // Order.populate()
    await PromotionAdapter.clearOfPromotion(order.id);

    let filteredPromotion = await PromotionAdapter.filterByConcept(order.concept);
    let promotionByConcept: Promotion[] | undefined = await PromotionAdapter.filterPromotions(filteredPromotion, order);

    if (promotionByConcept[0] !== undefined) {
      for (const promotion of promotionByConcept) {
        let state = await PromotionAdapter.promotions[promotion.id].action(order);
        promotionStates.push(state);
      }
    }
    
    return Promise.resolve(promotionStates)
  }

  // one method to get all promotions and id's
  public async displayDish(dish: Dish): Promise<AbstractPromotionHandler | undefined> {
    let filteredPromotion = await PromotionAdapter.filterByConcept(dish.concept);
    let promotionByConcept: Promotion[] | undefined = await PromotionAdapter.filterPromotions(filteredPromotion, dish);

    if (promotionByConcept[0] === undefined) return undefined;

    // TODO: this should work on first condition isJoint and isPublic should be true
    if (promotionByConcept[0]?.isJoint === true && promotionByConcept[0]?.isPublic === true) {
      return PromotionAdapter.promotions[promotionByConcept[0].id];
    }
    return undefined;
  }

  public async displayGroup(group: Group): Promise<AbstractPromotionHandler | undefined> {
    // check isJoint = true, isPublic = true
    let filteredPromotion = await PromotionAdapter.filterByConcept(group.concept);
    let promotionByConcept: Promotion[] | undefined = await PromotionAdapter.filterPromotions(filteredPromotion, group);

    if (promotionByConcept[0] === undefined) return undefined;
    // TODO: this should work on first condition isJoint and isPublic should be true
    if (promotionByConcept[0]?.isJoint === true && promotionByConcept[0]?.isPublic === true) {
      return PromotionAdapter.promotions[promotionByConcept[0].id];
    }
    return undefined;
  }

  public static async filterByConcept(concept: string): Promise<Promotion[]> {
    let modifiedConcept: string[];
    typeof concept === "string" ? (modifiedConcept = [concept]) : (modifiedConcept = concept);
    return await Promotion.getAllByConcept(modifiedConcept);
  }

  public static async filterPromotions(promotionsByConcept: Promotion[], target: Group | Dish | Order): Promise<Promotion[] | undefined> {
    let filteredPromotionsToApply: Promotion[] | undefined[] = Object.values(promotionsByConcept)
      .filter((record) => {
        if (!record.worktime) return true;
        try {
          return WorkTimeValidator.isWorkNow({ worktime: record.worktime }).workNow;
        } catch (error) {
          sails.log.error("Promotion > helper > error: ", error);
        }
      })
      .sort((a, b) => b.sortOrder - a.sortOrder);

    const filteredByCondition: Promotion[] = await PromotionAdapter.filterByCondition(filteredPromotionsToApply, target);

    // return first isJoint = false
    let filteredByJointPromotions: Promotion[] | undefined[] = [
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

  public static async filterByCondition(promotions: Promotion[], target: Group | Dish | Order): Promise<Promotion[]> {
    const filteredPromotions = [];

    for (const promotion of promotions) {
      const conditionMet = PromotionAdapter.promotions[promotion.id].condition(target);

      if (conditionMet) {
        filteredPromotions.push(promotion);
      }
    }

    return filteredPromotions;
  }

  // public async clearOrderDiscount(): Promise<void> {
  //   await Discount.clear()
  //   DiscountAdapter.discounts = {};
  // }

  // for configured discounts
  public async addPromotionHandler(promotionToAdd: AbstractPromotionHandler): Promise<void> {
    const DISCOUNT_ENABLE_BY_DEFAULT = (await Settings.get("Promotion_ENABLE_BY_DEFAULT")) ?? true;
    let createInModelPromotion: Promotion = {
      id: promotionToAdd.id,
      isJoint: promotionToAdd.isJoint,
      name: promotionToAdd.name,
      isPublic: promotionToAdd.isPublic,
      enable: Boolean(DISCOUNT_ENABLE_BY_DEFAULT),
      isDeleted: false,
      createdByUser: false,
      ...(promotionToAdd.description && { description: promotionToAdd.description }),
      ...(promotionToAdd.concept && { concept: promotionToAdd.concept }),
      configDiscount: promotionToAdd.configDiscount,
      sortOrder: 0, // discountToAdd.sortOrder,
      externalId: promotionToAdd.externalId,
      worktime: null, // promotionToAdd.worktime
    };

    //setORMID
    await Promotion.createOrUpdate(createInModelPromotion);
    // await Discount.setAlive([...id])
    PromotionAdapter.promotions[promotionToAdd.id] = promotionToAdd; // = new configuredDiscount(discountToAdd)
  }

  public static async recreateConfiguredPromotionHandler(promotionToAdd: Promotion): Promise<void> {
    
    if(promotionToAdd.enable === false && PromotionAdapter.promotions[promotionToAdd.id]){
      delete PromotionAdapter.promotions[promotionToAdd.id]
      return 
    }

    try{
      if (!PromotionAdapter.promotions[promotionToAdd.id] ) {
        PromotionAdapter.promotions[promotionToAdd.id] = new configuredPromotion(promotionToAdd, promotionToAdd.configDiscount);
      }
    } catch(e){
      sails.log.error("recreateConfiguredPromotionHandler", e)

    }

  }

  public static async getPromotionHandlerById(id: string): Promise<AbstractPromotionHandler | undefined> {
    // let disc: AbstractDiscountHandler = await Discount.getById(id);
    return PromotionAdapter.promotions[id];
  }

  public async getAllConcept(concept: string[]): Promise<AbstractPromotionHandler[]> {
    return await Promotion.getAllByConcept(concept);
  }

  public getActivePromotionsIds(): string[] {
    return Object.keys(PromotionAdapter.promotions);
  }

  static initialize(initParams?: { [key: string]: string | number | boolean }): PromotionAdapter {
    return PromotionAdapter.prototype;
  }
}
