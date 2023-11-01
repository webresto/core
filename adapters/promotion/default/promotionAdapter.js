"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromotionAdapter = void 0;
const AbstractPromotionAdapter_1 = __importDefault(require("../AbstractPromotionAdapter"));
const worktime_1 = require("@webresto/worktime");
const configuredPromotion_1 = __importDefault(require("./configuredPromotion"));
const findModelInstance_1 = __importDefault(require("../../../libs/findModelInstance"));
class PromotionAdapter extends AbstractPromotionAdapter_1.default {
    recreatePromotionHandler(promotionToAdd) {
        throw new Error("Method not implemented.");
    }
    applyPromotion(orderId, spendPromotion, promotionId) {
        throw new Error("Method not implemented.");
    }
    async processOrder(order) {
        const promotionStates = [];
        // Order.populate()
        await this.clearOfPromotion(order.id);
        let filteredPromotion = this.filterByConcept(order.concept);
        let promotionByConcept = this.filterPromotions(filteredPromotion, order);
        if (promotionByConcept[0] !== undefined) {
            for (const promotion of promotionByConcept) {
                let state = await this.promotions[promotion.id].action(order);
                promotionStates.push(state);
            }
        }
        return Promise.resolve(promotionStates);
    }
    // one method to get all promotions and id's
    displayDish(dish) {
        let filteredPromotion = this.filterByConcept(dish.concept);
        let promotionByConcept = this.filterPromotions(filteredPromotion, dish);
        if (promotionByConcept[0] === undefined)
            return dish;
        // TODO: this should work on first condition isJoint and isPublic should be true
        try {
            this.promotions[promotionByConcept[0].id].displayDish(dish);
        }
        catch (error) {
            sails.log.error("Promotion Adapter display Dish error", error);
        }
        return dish;
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
    filterByCondition(promotions, target) {
        const filteredPromotions = [];
        for (const promotion of promotions) {
            const conditionMet = this.promotions[promotion.id].condition(target);
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
        this.promotions[promotionToAdd.id] = promotionToAdd; // = new ConfiguredDiscount(discountToAdd)
    }
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
    async getAllConcept(concept) {
        return await Promotion.getAllByConcept(concept);
    }
    deletePromotion(id) {
        // this.promotions(id)
        return;
    }
    getActivePromotionsIds() {
        return Object.keys(this.promotions);
    }
}
exports.PromotionAdapter = PromotionAdapter;
