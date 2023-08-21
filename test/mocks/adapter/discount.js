"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryDiscountAdapter = void 0;
const AbstractPromotion_1 = require("../../../adapters/promotion/AbstractPromotion");
const findModelInstance_1 = require("../../../libs/findModelInstance");
const promotionAdapter_1 = require("./../../../adapters/promotion/default/promotionAdapter");
const stringsInArray_1 = require("../../../libs/stringsInArray");
const configuredPromotion_1 = require("../../../adapters/promotion/default/configuredPromotion");
const decimal_js_1 = require("decimal.js");
class InMemoryDiscountAdapter extends AbstractPromotion_1.default {
    constructor() {
        super(...arguments);
        this.id = "aaaa";
        this.isJoint = true;
        this.name = "New Year";
        this.isPublic = false;
        this.description = "some text";
        this.concept = ["NewYear", "Happy Birthday", "origin", "3dif"];
        this.configDiscount = {
            discountAmount: 10,
            discountType: "percentage",
            dishes: ["a"],
            groups: ["a"],
            excludeModifiers: false
        };
        // public sortOrder: number = 1;
        // public productCategoryDiscounts: any = {};
        this.hash = "my-hash";
        this.externalId = "my-external-id";
    }
    // public worktime?: WorkTime[] = null;
    condition(arg) {
        // this.concept.includes(arg.concept)
        if ((0, findModelInstance_1.default)(arg) === "Order" && (0, stringsInArray_1.stringsInArray)(arg.concept, this.concept)) {
            // order not used for configuredPromotion
            // Order.populate()
            // TODO: check if includes groups and dishes
            // where to get groups?
            return true;
        }
        if ((0, findModelInstance_1.default)(arg) === "Dish" && (0, stringsInArray_1.stringsInArray)(arg.concept, this.concept)) {
            if (this.configDiscount.dishes.includes(arg.id)) {
                return true;
            }
        }
        if ((0, findModelInstance_1.default)(arg) === "Group" && (0, stringsInArray_1.stringsInArray)(arg.concept, this.concept)) {
            if (this.configDiscount.groups.includes(arg.id)) {
                return true;
            }
        }
        return false;
    }
    async action(order) {
        let configuredPromotion = new configuredPromotion_1.default(this, this.configDiscount);
        await configuredPromotion.applyPromotion(order.id);
        return {
            message: "test",
            type: "test",
            state: {}
        };
    }
    displayGroup(group, user) {
        if (this.isJoint === true && this.isPublic === true) {
            group.discountAmount = promotionAdapter_1.PromotionAdapter.promotions[this.id].configDiscount.discountAmount;
            group.discountType = promotionAdapter_1.PromotionAdapter.promotions[this.id].configDiscount.discountType;
        }
        return group;
    }
    displayDish(dish, user) {
        if (this.isJoint === true && this.isPublic === true) {
            // 
            dish.discountAmount = promotionAdapter_1.PromotionAdapter.promotions[this.id].configDiscount.discountAmount;
            dish.discountType = promotionAdapter_1.PromotionAdapter.promotions[this.id].configDiscount.discountType;
            dish.oldPrice = dish.price;
            dish.price = this.configDiscount.discountType === "flat"
                ? new decimal_js_1.default(dish.price).minus(+this.configDiscount.discountAmount).toNumber()
                : new decimal_js_1.default(dish.price)
                    .mul(+this.configDiscount.discountAmount / 100)
                    .toNumber();
        }
        return dish;
    }
}
exports.InMemoryDiscountAdapter = InMemoryDiscountAdapter;
