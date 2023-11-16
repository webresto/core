"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const faker_1 = __importDefault(require("faker"));
const findModelInstance_1 = __importDefault(require("../../libs/findModelInstance"));
const configuredPromotion_1 = __importDefault(require("../../adapters/promotion/default/configuredPromotion"));
const stringsInArray_1 = require("../../libs/stringsInArray");
const decimal_js_1 = __importDefault(require("decimal.js"));
var autoincrement = 0;
function discountGenerator(config = {
    id: "",
    isJoint: true,
    name: "",
    badge: 'test',
    isPublic: false,
    // enable: false,
    // isDeleted: false,
    // createdByUser: false,
    description: "",
    concept: [],
    configDiscount: undefined,
    // sortOrder: 0,
    // productCategoryDiscounts: undefined,
    externalId: "",
}) {
    autoincrement++;
    return {
        id: config.id || faker_1.default.random.uuid(),
        description: "Discount generator description",
        // sortOrder: autoincrement,
        badge: 'test',
        name: config.name || faker_1.default.commerce.productName(),
        // isDeleted: config.isDeleted || false,
        isJoint: config.isJoint || false,
        isPublic: false,
        // enable: config.enable || false,
        // createdByUser: config.createdByUser || false,
        concept: config.concept || [],
        configDiscount: config.configDiscount || {
            discountAmount: 1.33,
            discountType: "flat",
            dishes: ["a"],
            groups: ["a"],
            excludeModifiers: false
        },
        // productCategoryDiscounts: undefined,
        condition: function (arg) {
            if ((0, findModelInstance_1.default)(arg) === "Order" && (0, stringsInArray_1.stringsInArray)(arg.concept, this.concept)) {
                let order = arg;
                // TODO:  if order.dishes type number[]
                let orderDishes = order.dishes;
                let checkDishes = orderDishes.map(order => order.dish).some((dish) => this.configDiscount.dishes.includes(dish.id));
                let checkGroups = orderDishes.map(order => order.dish).some((dish) => this.configDiscount.groups.includes(dish.parentGroup));
                if (checkDishes && checkGroups)
                    return true;
                return false;
            }
            if ((0, findModelInstance_1.default)(arg) === "Dish" && (0, stringsInArray_1.stringsInArray)(arg.concept, this.concept)) {
                return (0, stringsInArray_1.stringsInArray)(arg.id, this.configDiscount.dishes);
                // if(this.config.dishes.includes(arg.id)){
                //   return true;
                // }
            }
            if ((0, findModelInstance_1.default)(arg) === "Group" && (0, stringsInArray_1.stringsInArray)(arg.concept, this.concept)) {
                return (0, stringsInArray_1.stringsInArray)(arg.id, this.configDiscount.groups);
                // if(this.config.groups.includes(arg.id)){
                //   return true;
                // }
            }
            return false;
        },
        action: async function (order) {
            let configuredPromotion = new configuredPromotion_1.default(this, this.configDiscount);
            return await configuredPromotion.applyPromotion(order);
        },
        // sortOrder: 0,
        displayGroup: function (group, user) {
            if (this.isJoint === true && this.isPublic === true) {
                // 
                group.discountAmount = Adapter.getPromotionAdapter().promotions[this.id].configDiscount.discountAmount;
                group.discountType = Adapter.getPromotionAdapter().promotions[this.id].configDiscount.discountType;
            }
            return group;
        },
        displayDish: function (dish, user) {
            if (this.isJoint === true && this.isPublic === true) {
                // 
                dish.discountAmount = Adapter.getPromotionAdapter().promotions[this.id].configDiscount.discountAmount;
                dish.discountType = Adapter.getPromotionAdapter().promotions[this.id].configDiscount.discountType;
                dish.oldPrice = dish.price;
                dish.price = this.configDiscount.discountType === "flat"
                    ? new decimal_js_1.default(dish.price).minus(+this.configDiscount.discountAmount).toNumber()
                    : new decimal_js_1.default(dish.price)
                        .mul(+this.configDiscount.discountAmount / 100)
                        .toNumber();
            }
            return dish;
        },
        externalId: faker_1.default.random.uuid()
    };
}
exports.default = discountGenerator;
// export let discountFields = ["id", "additionalInfo", "code", "description", "order", "images", "name", "isDeleted", "dishes"];
