"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromotionAdapter = void 0;
const decimal_js_1 = __importDefault(require("decimal.js"));
const AbstractPromotionAdapter_1 = __importDefault(require("../AbstractPromotionAdapter"));
const worktime_1 = require("@webresto/worktime");
const configuredPromotion_1 = __importDefault(require("./configuredPromotion"));
const findModelInstance_1 = __importDefault(require("../../../libs/findModelInstance"));
class PromotionAdapter extends AbstractPromotionAdapter_1.default {
    constructor() {
        super(...arguments);
        this.promotions = {};
    }
    async processOrder(populatedOrder) {
        const promotionStates = [];
        populatedOrder = await this.clearOfPromotion(populatedOrder);
        let filteredPromotion = this.filterByConcept(populatedOrder.concept);
        let promotionByConcept = this.filterPromotions(filteredPromotion, populatedOrder);
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
            populatedOrder.discountTotal = new decimal_js_1.default(populatedOrder.discountTotal).plus(populatedOrder.promotionFlatDiscount).toNumber();
        }
        // --- CALCULATE DISCOUNTS END --- //
        populatedOrder.promotionState = promotionStates;
        // populatedOrder = await Order.findOne(populatedOrder.id) 
        return populatedOrder;
    }
    // one method to get all promotions and id's
    displayDish(dish) {
        try {
            let filteredPromotion = this.filterByConcept(dish.concept);
            let promotionByConcept = this.filterPromotions(filteredPromotion, dish);
            if (promotionByConcept[0] === undefined)
                return dish;
            // TODO: this should work on first condition isJoint and isPublic should be true
            return this.promotions[promotionByConcept[0].id].displayDish(dish);
        }
        catch (error) {
            sails.log.error("Promotion Adapter display Dish error", error);
        }
    }
    displayGroup(group) {
        // check isJoint = true, isPublic = true
        let filteredPromotion = this.filterByConcept(group.concept);
        let promotionByConcept = this.filterPromotions(filteredPromotion, group);
        if (promotionByConcept[0] === undefined)
            return group;
        // TODO: this should work on first condition isJoint and isPublic should be true
        if (promotionByConcept[0]?.isJoint === true && promotionByConcept[0]?.isPublic === true) {
            group.discountAmount = this.promotions[promotionByConcept[0].id].configDiscount.discountAmount;
            group.discountType = this.promotions[promotionByConcept[0].id].configDiscount.discountType;
            return group;
        }
        return group;
    }
    filterByConcept(concept) {
        let modifiedConcept;
        typeof concept === "string" ? (modifiedConcept = [concept]) : (modifiedConcept = concept);
        return Promotion.getAllByConcept(modifiedConcept);
    }
    filterPromotions(promotionsByConcept, target) {
        /**
         * If promotion enabled by promocode notJoint it will be disable all promotions and set promocode promotion
         * If promocode promotion is joint it just will be applied by order
         */
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
        const filteredByCondition = this.filterByCondition(filteredPromotionsToApply, target);
        // Promotion by PromotionCode not need filtred
        if ((0, findModelInstance_1.default)(target) === "Order") {
            const order = target;
            if (order.promotionCode) {
                const promotionCode = order.promotionCode;
                if (promotionCode.promotion.length) {
                    promotionCode.promotion.forEach((p) => {
                        p.sortOrder = -Infinity;
                        promotionsByConcept.push(p);
                    });
                }
            }
        }
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
    filterByCondition(promotionsToCheck, target) {
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
    async addPromotionHandler(promotionToAdd) {
        let createInModelPromotion = {
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
    recreateConfiguredPromotionHandler(promotionToAdd) {
        if (promotionToAdd.enable === false && this.promotions[promotionToAdd.id]) {
            delete this.promotions[promotionToAdd.id];
            return;
        }
        try {
            if (!this.promotions[promotionToAdd.id]) {
                this.promotions[promotionToAdd.id] = new configuredPromotion_1.default(promotionToAdd, promotionToAdd.configDiscount);
                return;
            }
            return;
        }
        catch (e) {
            sails.log.error("recreateConfiguredPromotionHandler", e);
        }
        return;
    }
    getPromotionHandlerById(id) {
        // let disc: AbstractDiscountHandler = await Discount.getById(id);
        return this.promotions[id];
    }
    deletePromotion(id) {
        // this.promotions(id)
        return;
    }
    deletePromotionByBadge(badge) {
        for (const promotion in this.promotions) {
            if (this.promotions[promotion].badge === badge) {
                delete (this.promotions[promotion].badge);
            }
        }
    }
    getActivePromotionsIds() {
        return Object.keys(this.promotions);
    }
}
exports.PromotionAdapter = PromotionAdapter;
