"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromotionAdapter = void 0;
const AbstractPromotionAdapter_1 = require("../AbstractPromotionAdapter");
const worktime_1 = require("@webresto/worktime");
const configuredPromotion_1 = require("./configuredPromotion");
class PromotionAdapter extends AbstractPromotionAdapter_1.default {
    async processOrder(order) {
        const promotionStates = [];
        // Order.populate()
        await PromotionAdapter.clearOfPromotion(order.id);
        let filteredPromotion = await PromotionAdapter.filterByConcept(order.concept);
        let promotionByConcept = await PromotionAdapter.filterPromotions(filteredPromotion, order);
        if (promotionByConcept[0] !== undefined) {
            for (const promotion of promotionByConcept) {
                let state = await PromotionAdapter.promotions[promotion.id].action(order);
                promotionStates.push(state);
            }
        }
        return Promise.resolve(promotionStates);
    }
    // one method to get all promotions and id's
    async displayDish(dish) {
        let filteredPromotion = await PromotionAdapter.filterByConcept(dish.concept);
        let promotionByConcept = await PromotionAdapter.filterPromotions(filteredPromotion, dish);
        if (promotionByConcept[0] === undefined)
            return undefined;
        // TODO: this should work on first condition isJoint and isPublic should be true
        if (promotionByConcept[0]?.isJoint === true && promotionByConcept[0]?.isPublic === true) {
            return PromotionAdapter.promotions[promotionByConcept[0].id];
        }
        return undefined;
    }
    async displayGroup(group) {
        // check isJoint = true, isPublic = true
        let filteredPromotion = await PromotionAdapter.filterByConcept(group.concept);
        let promotionByConcept = await PromotionAdapter.filterPromotions(filteredPromotion, group);
        if (promotionByConcept[0] === undefined)
            return undefined;
        // TODO: this should work on first condition isJoint and isPublic should be true
        if (promotionByConcept[0]?.isJoint === true && promotionByConcept[0]?.isPublic === true) {
            return PromotionAdapter.promotions[promotionByConcept[0].id];
        }
        return undefined;
    }
    static async filterByConcept(concept) {
        let modifiedConcept;
        typeof concept === "string" ? (modifiedConcept = [concept]) : (modifiedConcept = concept);
        return await Promotion.getAllByConcept(modifiedConcept);
    }
    static async filterPromotions(promotionsByConcept, target) {
        let filteredPromotionsToApply = Object.values(promotionsByConcept)
            .filter((record) => {
            if (!record.worktime)
                return true;
            try {
                return worktime_1.WorkTimeValidator.isWorkNow({ worktime: record.worktime }).workNow;
            }
            catch (error) {
                sails.log.error("Promotion > helper > error: ", error);
            }
        })
            .sort((a, b) => b.sortOrder - a.sortOrder);
        const filteredByCondition = await PromotionAdapter.filterByCondition(filteredPromotionsToApply, target);
        // return first isJoint = false
        let filteredByJointPromotions = [
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
    static async filterByCondition(promotions, target) {
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
    // for Configured discounts
    async addPromotionHandler(promotionToAdd) {
        const DISCOUNT_ENABLE_BY_DEFAULT = (await Settings.get("Promotion_ENABLE_BY_DEFAULT")) ?? true;
        let createInModelPromotion = {
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
            sortOrder: 0,
            externalId: promotionToAdd.externalId,
            worktime: null, // promotionToAdd.worktime
        };
        //setORMID
        await Promotion.createOrUpdate(createInModelPromotion);
        // await Discount.setAlive([...id])
        PromotionAdapter.promotions[promotionToAdd.id] = promotionToAdd; // = new ConfiguredDiscount(discountToAdd)
    }
    static async recreateConfiguredPromotionHandler(promotionToAdd) {
        if (promotionToAdd.enable === false && PromotionAdapter.promotions[promotionToAdd.id]) {
            delete PromotionAdapter.promotions[promotionToAdd.id];
            return;
        }
        try {
            if (!PromotionAdapter.promotions[promotionToAdd.id]) {
                PromotionAdapter.promotions[promotionToAdd.id] = new configuredPromotion_1.default(promotionToAdd, promotionToAdd.configDiscount);
            }
        }
        catch (e) {
            sails.log.error("recreateConfiguredPromotionHandler", e);
        }
    }
    static async getPromotionHandlerById(id) {
        // let disc: AbstractDiscountHandler = await Discount.getById(id);
        return PromotionAdapter.promotions[id];
    }
    async getAllConcept(concept) {
        return await Promotion.getAllByConcept(concept);
    }
    getActivePromotionsIds() {
        return Object.keys(PromotionAdapter.promotions);
    }
    static initialize(initParams) {
        return PromotionAdapter.prototype;
    }
}
PromotionAdapter.promotions = {};
exports.PromotionAdapter = PromotionAdapter;
