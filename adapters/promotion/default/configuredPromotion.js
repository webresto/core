"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// import { WorkTime } from "@webresto/worktime";
const AbstractPromotion_1 = require("../AbstractPromotion");
const findModelInstance_1 = require("../../../libs/findModelInstance");
const decimal_js_1 = require("decimal.js");
const stringsInArray_1 = require("../../../libs/stringsInArray");
class ConfiguredPromotion extends AbstractPromotion_1.default {
    constructor(promotion, config) {
        super();
        this.config = {};
        if (config === undefined) {
            throw new Error("ConfiguredPromotion: Config not defined");
        }
        if ((config.dishes.length + config.groups.length) === 0
            || !config.discountType || !config.discountAmount) {
            throw new Error("ConfiguredPromotion: bad config");
        }
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
        // console.log(arg, "CONFIGURED CONDITION")
        if ((0, findModelInstance_1.default)(arg) === "Order" && (0, stringsInArray_1.stringsInArray)(arg.concept, this.concept)) {
            let order = arg;
            // TODO:  if order.dishes type number[]
            let orderDishes = order.dishes;
            for (let i = 0; i < orderDishes.length; i++) {
                if (!this.config.dishes.includes(orderDishes[i].dish)) {
                    console.log("This id doesn't include in this promotion");
                    return false;
                }
            }
            // order not used for configuredPromotion
            // TODO: check if includes groups and dishes
            // where to get groups?
            // const orderDishes = await OrderDish.find({ order: arg.id }).populate("dish");
            // for (const orderDish of orderDishes) {
            //   this.config.dishes.includes(orderDish.id + "")
            //   this.config.groups.includes(orderDish)
            // }
            return true;
        }
        if ((0, findModelInstance_1.default)(arg) === "Dish" && (0, stringsInArray_1.stringsInArray)(arg.concept, this.concept)) {
            if (this.config.dishes.includes(arg.id)) {
                return true;
            }
        }
        if ((0, findModelInstance_1.default)(arg) === "Group" && (0, stringsInArray_1.stringsInArray)(arg.concept, this.concept)) {
            if (this.config.groups.includes(arg.id)) {
                return true;
            }
        }
        return false;
    }
    async action(order) {
        // console.log(this.config + "  action")
        let mass = await this.applyPromotion(order.id);
        return mass;
    }
    async displayGroup(group, user) {
        if (user) {
            // TODO: show discount for group
            return await Group.display(group);
        }
    }
    async displayDish(dish, user) {
        if (user) {
            //  TODO: show discount for dish
            return await Dish.display(dish);
        }
    }
    async applyPromotion(orderId) {
        const order = await Order.findOne({ id: orderId });
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
                if (!(0, stringsInArray_1.stringsInArray)(orderDish.dish.concept, this.concept)) {
                    continue;
                }
                // ------------------------------------------ Decimal ------------------------------------------
                if (this.configDiscount.discountType === "flat") {
                    orderDishDiscountCost = new decimal_js_1.default(this.configDiscount.discountAmount).mul(orderDish.amount).toNumber();
                    discountCost = new decimal_js_1.default(orderDishDiscountCost).add(discountCost);
                    // discountCost += new Decimal(orderDish.dish.price * orderDish.dish.amount).sub(this.configDiscount.discountAmount * orderDish.dish.amount ).toNumber();
                }
                if (this.configDiscount.discountType === "percentage") {
                    // let discountPrice:number = new Decimal(orderDish.dish.price).mul(orderDish.amount).mul(+this.configDiscount.discountAmount / 100).toNumber();
                    orderDishDiscountCost = new decimal_js_1.default(orderDish.dish.price)
                        .mul(orderDish.amount)
                        .mul(+this.configDiscount.discountAmount / 100)
                        .toNumber();
                    discountCost = new decimal_js_1.default(orderDishDiscountCost).add(discountCost);
                }
                let orderDishDiscount = new decimal_js_1.default(orderDish.discountTotal).add(orderDishDiscountCost).toNumber();
                await OrderDish.update({ id: orderDish.id }, { discountTotal: orderDishDiscount, discountType: this.configDiscount.discountType }).fetch();
            }
            // Update the order with new total
            let orderDiscount = new decimal_js_1.default(order.discountTotal).add(discountCost.toNumber()).toNumber();
            // console.log(orderDiscount, "===================== UPDATE ORDER ========================")
            await Order.updateOne({ id: orderId }, { discountTotal: orderDiscount });
            // let discountCoverage: Decimal;
            // await Order.updateOne({id: orderId}, {total: order.total, discountTotal:  discountCoverage.toNumber()});
        }
        else {
            throw `User not found in Order, applyDiscount failed`;
        }
        return {
            message: `${this.description}`,
            type: "configured-promotion",
            state: {}
        };
    }
}
exports.default = ConfiguredPromotion;
