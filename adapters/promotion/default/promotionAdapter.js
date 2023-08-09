"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromotionAdapter = void 0;
const decimal_js_1 = require("decimal.js");
const AbstractPromotionAdapter_1 = require("../AbstractPromotionAdapter");
const configuredPromotion_1 = require("./configuredPromotion");
const worktime_1 = require("@webresto/worktime");
const stringsInArray_1 = require("../../../libs/stringsInArray");
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
        return promotionStates;
    }
    // one method to get all promotions and id's
    async displayDish(dish) {
        let filteredPromotion = await PromotionAdapter.filterByConcept(dish.concept);
        let promotionByConcept = await PromotionAdapter.filterPromotions(filteredPromotion, dish);
        if (promotionByConcept[0] === undefined)
            return undefined;
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
    // for configured discounts
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
            // productCategoryDiscounts: {},// discountToAdd.productCategoryDiscounts,
            externalId: promotionToAdd.externalId,
            worktime: null, // promotionToAdd.worktime
        };
        //setORMID
        await Promotion.createOrUpdate(createInModelPromotion);
        // await Discount.setAlive([...id])
        PromotionAdapter.promotions[promotionToAdd.id] = promotionToAdd; // = new configuredDiscount(discountToAdd)
    }
    static async recreatePromotionHandler(promotionToAdd) {
        if (!PromotionAdapter.promotions[promotionToAdd.id]) {
            PromotionAdapter.promotions[promotionToAdd.id] = new configuredPromotion_1.default(promotionToAdd, promotionToAdd.configDiscount);
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
    static async clearOfPromotion(orderId) {
        const order = await Order.findOne({ id: orderId });
        // if Order.status ="PAYMENT" or "ORDER" can't clear promotions
        if (order.state === "ORDER")
            throw "order with orderId " + order.id + "in state ORDER";
        if (order.state === "PAYMENT")
            throw "order with orderId " + order.id + "in state PAYMENT";
        // ------------------------------------------ OrderDish update ------------------------------------------
        const orderDishes = await OrderDish.find({ order: order.id }).populate("dish");
        for (const orderDish of orderDishes) {
            await OrderDish.update({ id: orderDish.id }, { discountTotal: 0, discountType: "" }).fetch();
        }
        await Order.updateOne({ id: order.id }, { discountTotal: 0 });
    }
    /**
     * @deprecated //TODO: move to configured discount
     */
    static async applyPromotion(orderId, spendDiscount, promotionId) {
        const order = await Order.findOne({ id: orderId });
        if (order.user && typeof order.user === "string") {
            const promotion = await Promotion.findOne({ id: promotionId });
            // order.dishes
            const orderDishes = await OrderDish.find({ order: order.id }).populate("dish");
            let discountCost = new decimal_js_1.default(0);
            for (const orderDish of orderDishes) {
                let orderDishDiscountCost = 0;
                if (!orderDish.dish) {
                    sails.log.error("orderDish", orderDish.id, "has no such dish");
                    continue;
                }
                // TODO: if concept:arrays
                if (!(0, stringsInArray_1.stringsInArray)(orderDish.dish.concept, promotion.concept)) {
                    // console.log("stringsInArray: ==== ", orderDish.dish.concept, promotion.concept);
                    continue;
                }
                // ------------------------------------------ Decimal ------------------------------------------
                if (spendDiscount.discountType === "flat") {
                    orderDishDiscountCost = new decimal_js_1.default(spendDiscount.discountAmount).mul(orderDish.amount).toNumber();
                    discountCost = new decimal_js_1.default(orderDishDiscountCost).add(discountCost);
                    // discountCost += new Decimal(orderDish.dish.price * orderDish.dish.amount).sub(spendDiscount.discountAmount * orderDish.dish.amount ).toNumber();
                }
                if (spendDiscount.discountType === "percentage") {
                    // let discountPrice:number = new Decimal(orderDish.dish.price).mul(orderDish.amount).mul(+spendDiscount.discountAmount / 100).toNumber();
                    orderDishDiscountCost = new decimal_js_1.default(orderDish.dish.price)
                        .mul(orderDish.amount)
                        .mul(+spendDiscount.discountAmount / 100)
                        .toNumber();
                    discountCost = new decimal_js_1.default(orderDishDiscountCost).add(discountCost);
                }
                let orderDishDiscount = new decimal_js_1.default(orderDish.discountTotal).add(orderDishDiscountCost).toNumber();
                await OrderDish.update({ id: orderDish.id }, { discountTotal: orderDishDiscount, discountType: spendDiscount.discountType }).fetch();
                // await OrderDish.update({ id: orderDish.id }, { discountTotal:  orderDishDiscountCost, discountType: spendDiscount.discountType}).fetch();
                // await OrderDish.update({ id: orderDish.id }, { amount: orderDish.dish.price, discount: discountCost}).fetch();
            }
            // Update the order with new total
            let orderDiscount = new decimal_js_1.default(order.discountTotal).add(discountCost.toNumber()).toNumber();
            await Order.updateOne({ id: orderId }, { discountTotal: orderDiscount });
            // let discountCoverage: Decimal;
            // await Order.updateOne({id: orderId}, {total: order.total, discountTotal:  discountCoverage.toNumber()});
        }
        else {
            throw `User not found in Order, applyDiscount failed`;
        }
    }
    static initialize(initParams) {
        return PromotionAdapter.prototype;
    }
}
PromotionAdapter.promotions = {};
exports.PromotionAdapter = PromotionAdapter;
