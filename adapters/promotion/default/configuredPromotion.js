"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// import { WorkTime } from "@webresto/worktime";
const AbstractPromotion_1 = require("../AbstractPromotion");
const findModelInstance_1 = require("../../../libs/findModelInstance");
const decimal_js_1 = require("decimal.js");
class configuredPromotion extends AbstractPromotion_1.default {
    constructor(promotion, config) {
        super();
        this.config = {};
        this.config = config;
        this.id = promotion.id,
            this.isJoint = promotion.isJoint,
            this.name = promotion.name,
            this.isPublic = promotion.isPublic;
        this.description = promotion.description;
        this.concept = promotion.concept;
        this.configDiscount = promotion.configDiscount;
        this.externalId = promotion.externalId;
    }
    condition(arg) {
        if ((0, findModelInstance_1.default)(arg) === "Order" && this.concept.includes(arg.concept)) {
            // order not used for configuredPromotion
            // Order.populate()
            return true;
        }
        if ((0, findModelInstance_1.default)(arg) === "Dish" && this.concept.includes(arg.concept)) {
            if (this.config.dishes.includes(arg.id)) {
                return true;
            }
        }
        if ((0, findModelInstance_1.default)(arg) === "Group" && this.concept.includes(arg.concept)) {
            if (this.config.groups.includes(arg.id)) {
                return true;
            }
        }
        return false;
    }
    async action(order) {
        console.log(this.config + "  action");
        // return await PromotionAdapter.applyPromotion(order.id, this.config, this.id)
        // return Promise.resolve()
        if (order.user && typeof order.user === "string") {
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
                // ------------------------------------------ Decimal ------------------------------------------
                if (this.configDiscount.discountType === "flat") {
                    orderDishDiscountCost = new decimal_js_1.default(this.configDiscount.discountAmount).mul(orderDish.amount).toNumber();
                    discountCost = new decimal_js_1.default(orderDishDiscountCost).add(discountCost);
                    // discountCost += new Decimal(orderDish.dish.price * orderDish.dish.amount).sub(spendDiscount.discountAmount * orderDish.dish.amount ).toNumber();
                }
                if (this.configDiscount.discountType === "percentage") {
                    // let discountPrice:number = new Decimal(orderDish.dish.price).mul(orderDish.amount).mul(+spendDiscount.discountAmount / 100).toNumber();
                    orderDishDiscountCost = new decimal_js_1.default(orderDish.dish.price).mul(orderDish.amount).mul(+this.configDiscount.discountAmount / 100).toNumber();
                    discountCost = new decimal_js_1.default(orderDishDiscountCost).add(discountCost);
                }
                let orderDishDiscount = new decimal_js_1.default(orderDish.discountTotal).add(orderDishDiscountCost).toNumber();
                await OrderDish.update({ id: orderDish.id }, { discountTotal: orderDishDiscount, discountType: this.configDiscount.discountType }).fetch();
                // await OrderDish.update({ id: orderDish.id }, { discountTotal:  orderDishDiscountCost, discountType: spendDiscount.discountType}).fetch();
                // await OrderDish.update({ id: orderDish.id }, { amount: orderDish.dish.price, discount: discountCost}).fetch();
            }
            // Update the order with new total
            let orderDiscount = new decimal_js_1.default(order.discountTotal).add(discountCost.toNumber()).toNumber();
            await Order.updateOne({ id: order.id }, { discountTotal: orderDiscount }).fetch();
            // let discountCoverage: Decimal;
            // await Order.updateOne({id: orderId}, {total: order.total, discountTotal:  discountCoverage.toNumber()});
        }
        else {
            throw `User not found in Order, applyDiscount failed`;
        }
    }
    async displayGroup(group, user) {
        if (user) {
            //  return await Group.display(this.concept, group.id)
            return await Group.display(group);
        }
    }
    async displayDish(dish, user) {
        if (user) {
            //  return await Dish.display(this.concept, group.id)
            return await Dish.display(dish);
        }
    }
}
exports.default = configuredPromotion;
