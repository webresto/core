"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// import { WorkTime } from "@webresto/worktime";
const AbstractPromotion_1 = __importDefault(require("../AbstractPromotion"));
// todo: fix types model instance to {%ModelName%}Record for Group';
// todo: fix types model instance to {%ModelName%}Record for Dish';
// todo: fix types model instance to {%ModelName%}Record for OrderDish';
// todo: fix types model instance to {%ModelName%}Record for Order';
// todo: fix types model instance to {%ModelName%}Record for User';
const findModelInstance_1 = __importDefault(require("../../../libs/findModelInstance"));
const decimal_js_1 = __importDefault(require("decimal.js"));
const stringsInArray_1 = require("../../../libs/stringsInArray");
class ConfiguredPromotion extends AbstractPromotion_1.default {
    constructor(promotion, config) {
        super();
        this.badge = 'configured-promotion';
        this.config = {};
        if (config === undefined) {
            throw new Error("ConfiguredPromotion: Config not defined");
        }
        // if ((config.dishes.length + config.groups.length) === 0
        //   || !config.discountType || !config.discountAmount) {
        //   throw new Error("ConfiguredPromotion: bad config")
        // }
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
        if ((0, findModelInstance_1.default)(arg) === "Order" && (this.concept[0] === undefined || this.concept[0] === "")
            ? true : (0, stringsInArray_1.someInArray)(arg.concept, this.concept)) {
            let order = arg;
            // TODO:  if order.dishes type number[]
            let orderDishes = order.dishes;
            let checkDishes = orderDishes.map(order => order.dish).some((dish) => this.config.dishes.includes(dish.id));
            let checkGroups = orderDishes.map(order => order.dish).some((dish) => this.config.groups.includes(dish.parentGroup));
            if (checkDishes || checkGroups)
                return true;
            return false;
        }
        if ((0, findModelInstance_1.default)(arg) === "Dish" && (this.concept[0] === undefined || this.concept[0] === "") ? true :
            (0, stringsInArray_1.someInArray)(arg.concept, this.concept)) {
            return (0, stringsInArray_1.someInArray)(arg.id, this.config.dishes);
        }
        if ((0, findModelInstance_1.default)(arg) === "Group" && (this.concept[0] === undefined || this.concept[0] === "") ? true :
            (0, stringsInArray_1.someInArray)(arg.concept, this.concept)) {
            return (0, stringsInArray_1.someInArray)(arg.id, this.config.groups);
        }
        return false;
    }
    async action(order) {
        let mass = await this.applyPromotion(order);
        return mass;
    }
    displayGroup(group, user) {
        // TODO: user implement logic personal discount
        if (this.isJoint === true && this.isPublic === true) {
            // 
            group.discountAmount = Adapter.getPromotionAdapter().promotions[this.id].configDiscount.discountAmount;
            group.discountType = Adapter.getPromotionAdapter().promotions[this.id].configDiscount.discountType;
        }
        return group;
    }
    displayDish(dish, user) {
        // TODO: user implement logic personal discount
        if (this.isJoint === true && this.isPublic === true) {
            // 
            dish.discountAmount = Adapter.getPromotionAdapter().promotions[this.id].configDiscount.discountAmount;
            dish.discountType = Adapter.getPromotionAdapter().promotions[this.id].configDiscount.discountType;
            dish.oldPrice = 123456; // TODO: delete it
            dish.salePrice = this.configDiscount.discountType === "flat"
                ? new decimal_js_1.default(dish.price).minus(+this.configDiscount.discountAmount).toNumber()
                : new decimal_js_1.default(dish.price)
                    .mul(+this.configDiscount.discountAmount / 100)
                    .toNumber();
        }
        return dish;
    }
    // TODO: rewrite for argument (modificable Order);
    async applyPromotion(order) {
        sails.log.debug(`Configured promotion to be applied. name: [${this.name}], id: [${this.id}]`);
        // order.dishes
        const orderDishes = await OrderDish.find({ order: order.id, addedBy: "user" }).populate("dish");
        let calculatedDiscountAmount = new decimal_js_1.default(0);
        // Discount that applies to all dishes
        if (!this.config.dishes.length && !this.config.groups.length) {
            if (this.configDiscount.discountType === "percentage") {
                calculatedDiscountAmount = new decimal_js_1.default(order.basketTotal)
                    .mul(+this.configDiscount.discountAmount / 100);
                // This is the case when a discount is set on the general receipt
            }
            else {
                calculatedDiscountAmount = new decimal_js_1.default(this.configDiscount.discountAmount ?? this.config.discountAmount);
            }
            // If groups and dishes are selected for the discount
        }
        else {
            for (let orderDish of orderDishes) {
                let discountAmount;
                if (typeof orderDish.dish === "string") {
                    throw new Error("Type error dish: applyPromotion expected array");
                }
                // Allowed only one 
                if (orderDish.discountId) {
                    sails.log.warn(`orderDish with id [${orderDish.id}] was called to apply a discount on top of another discount. Please note that the discount did not apply`);
                    continue;
                }
                if (!orderDish.dish) {
                    sails.log.error("orderDish", orderDish.id, "has no such dish");
                    continue;
                }
                if ((this.concept[0] === undefined || this.concept[0] === "") ?
                    false : !(0, stringsInArray_1.someInArray)(orderDish.dish.concept, this.concept)) {
                    continue;
                }
                let checkDishes = (0, stringsInArray_1.someInArray)(orderDish.dish.id, this.config.dishes);
                let checkGroups = (0, stringsInArray_1.someInArray)(orderDish.dish.parentGroup, this.config.groups);
                if (!checkDishes || !checkGroups)
                    continue;
                let itemTotalBeforeDiscount = orderDish.itemTotal;
                let orderDishDiscountCost = 0;
                if (this.configDiscount.discountType === "flat") {
                    discountAmount = this.configDiscount.discountAmount;
                    orderDishDiscountCost = new decimal_js_1.default(this.configDiscount.discountAmount).mul(orderDish.amount).toNumber();
                    calculatedDiscountAmount = new decimal_js_1.default(orderDishDiscountCost).add(calculatedDiscountAmount);
                }
                else if (this.configDiscount.discountType === "percentage") {
                    // let discountPrice:number = new Decimal(orderDish.dish.price).mul(orderDish.amount).mul(+this.configDiscount.discountAmount / 100).toNumber();
                    let orderDishDiscountItemCost = new decimal_js_1.default(orderDish.dish.price).mul(this.configDiscount.discountAmount).mul(0.01);
                    orderDishDiscountCost = orderDishDiscountItemCost.mul(orderDish.amount).toNumber();
                    discountAmount = orderDishDiscountItemCost.toNumber();
                    calculatedDiscountAmount = new decimal_js_1.default(orderDishDiscountCost).add(calculatedDiscountAmount);
                }
                else {
                    throw `Unknown discountType: [${this.configDiscount.discountType}] in name: [${this.name}], id: [${this.id}]`;
                }
                let discountTotal = new decimal_js_1.default(orderDish.discountTotal).add(orderDishDiscountCost).toNumber();
                const update = {
                    itemTotalBeforeDiscount,
                    discountTotal,
                    discountType: this.configDiscount.discountType,
                    discountAmount,
                    discountId: this.id,
                    discountDebugInfo: orderDish.discountDebugInfo + `${new Date()}: name[${this.name}], id[${this.id}]`
                };
                await OrderDish.update({ id: orderDish.id }, update).fetch();
            }
        }
        /**
         * Since there can be several promotions, they may already contain promotionFlatDiscount
         */
        if (order.promotionFlatDiscount > 0) {
            order.promotionFlatDiscount = new decimal_js_1.default(order.promotionFlatDiscount).plus(calculatedDiscountAmount).toNumber();
        }
        else {
            order.promotionFlatDiscount = calculatedDiscountAmount.toNumber();
        }
        // TODO: this is call in ORM unwanted, but without this the direct call to the cart discount does not work
        await Order.updateOne({ id: order.id }, { promotionFlatDiscount: order.promotionFlatDiscount });
        return {
            message: `${this.description}`,
            type: "configured-promotion",
            state: {
                config: this.config
            }
        };
    }
}
exports.default = ConfiguredPromotion;
