"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromotionAdapter = void 0;
const AbstractPromotionAdapter_1 = __importDefault(require("../AbstractPromotionAdapter"));
const worktime_1 = require("@webresto/worktime");
const configuredPromotion_1 = __importDefault(require("./configuredPromotion"));
class PromotionAdapter extends AbstractPromotionAdapter_1.default {
    async processOrder(order) {
        const promotionStates = [];
        // Order.populate()
        await PromotionAdapter.clearOfPromotion(order.id);
        // console.log(order, " ===================== ORDER")
        let filteredPromotion = PromotionAdapter.filterByConcept(order.concept);
        let promotionByConcept = PromotionAdapter.filterPromotions(filteredPromotion, order);
        if (promotionByConcept[0] !== undefined) {
            for (const promotion of promotionByConcept) {
                let state = await PromotionAdapter.promotions[promotion.id].action(order);
                promotionStates.push(state);
            }
        }
        return Promise.resolve(promotionStates);
    }
    // one method to get all promotions and id's
    displayDish(dish) {
        let filteredPromotion = PromotionAdapter.filterByConcept(dish.concept);
        let promotionByConcept = PromotionAdapter.filterPromotions(filteredPromotion, dish);
        if (promotionByConcept[0] === undefined)
            return dish;
        // TODO: this should work on first condition isJoint and isPublic should be true
        try {
            PromotionAdapter.promotions[promotionByConcept[0].id].displayDish(dish);
        }
        catch (error) {
            sails.log.error("Promotion Adapter display Dish error", error);
        }
        return dish;
    }
    displayGroup(group) {
        // check isJoint = true, isPublic = true
        let filteredPromotion = PromotionAdapter.filterByConcept(group.concept);
        let promotionByConcept = PromotionAdapter.filterPromotions(filteredPromotion, group);
        if (promotionByConcept[0] === undefined)
            return group;
        // TODO: this should work on first condition isJoint and isPublic should be true
        if (promotionByConcept[0]?.isJoint === true && promotionByConcept[0]?.isPublic === true) {
            group.discountAmount = PromotionAdapter.promotions[promotionByConcept[0].id].configDiscount.discountAmount;
            group.discountType = PromotionAdapter.promotions[promotionByConcept[0].id].configDiscount.discountType;
            return group;
        }
        return group;
    }
    static filterByConcept(concept) {
        let modifiedConcept;
        typeof concept === "string" ? (modifiedConcept = [concept]) : (modifiedConcept = concept);
        return Promotion.getAllByConcept(modifiedConcept);
    }
    static filterPromotions(promotionsByConcept, target) {
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
            .sort((a, b) => a.sortOrder - b.sortOrder);
        const filteredByCondition = PromotionAdapter.filterByCondition(filteredPromotionsToApply, target);
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
    static filterByCondition(promotions, target) {
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
    static recreateConfiguredPromotionHandler(promotionToAdd) {
        if (promotionToAdd.enable === false && PromotionAdapter.promotions[promotionToAdd.id]) {
            delete PromotionAdapter.promotions[promotionToAdd.id];
            return;
        }
        try {
            if (!PromotionAdapter.promotions[promotionToAdd.id]) {
                PromotionAdapter.promotions[promotionToAdd.id] = new configuredPromotion_1.default(promotionToAdd, promotionToAdd.configDiscount);
                return;
            }
            return;
        }
        catch (e) {
            sails.log.error("recreateConfiguredPromotionHandler", e);
        }
        return;
    }
    static async getPromotionHandlerById(id) {
        // let disc: AbstractDiscountHandler = await Discount.getById(id);
        return PromotionAdapter.promotions[id];
    }
    async getAllConcept(concept) {
        return await Promotion.getAllByConcept(concept);
    }
    deletePromotion(id) {
        // PromotionAdapter.promotions(id)
        return;
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
