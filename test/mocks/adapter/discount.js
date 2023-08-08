"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryDiscountAdapter = void 0;
const AbstractPromotion_1 = require("../../../adapters/promotion/AbstractPromotion");
const findModelInstance_1 = require("../../../libs/findModelInstance");
const promotionAdapter_1 = require("./../../../adapters/promotion/default/promotionAdapter");
class InMemoryDiscountAdapter extends AbstractPromotion_1.default {
    constructor() {
        super(...arguments);
        this.id = "aaaa";
        this.isJoint = true;
        this.name = "New Year";
        this.isPublic = false;
        // public enable: boolean = true;
        // public isDeleted: boolean = false;
        // public createdByUser: boolean = false;
        this.description = "some text";
        this.concept = ["NewYear", "Happy Birthday", "origin"];
        this.configDiscount = {
            discountAmount: 10,
            discountType: "percentage",
            dishes: [],
            groups: [],
            excludeModifiers: false
        };
        // public sortOrder: number = 1;
        // public productCategoryDiscounts: any = {};
        this.hash = "my-hash";
        this.externalId = "my-external-id";
    }
    // public worktime?: WorkTime[] = null;
    condition(arg) {
        if ((0, findModelInstance_1.default)(arg) === "Order" && this.concept.includes(arg.concept)) {
            // Order.populate()
            return true;
        }
        if ((0, findModelInstance_1.default)(arg) === "Dish" && this.concept.includes(arg.concept)) {
            // TODO: check if includes in IconfigDish
            return true;
        }
        if ((0, findModelInstance_1.default)(arg) === "Group" && this.concept.includes(arg.concept)) {
            // TODO: check if includes in IconfigG
            return true;
        }
        return false;
    }
    async action(order) {
        await promotionAdapter_1.PromotionAdapter.applyPromotion(order.id, this.configDiscount, this.id);
    }
    async displayGroup(group, user) {
        // Implement the displayGroupDiscount method logic
        // Display the group discount
        // console.log("displayGroupDish")\
        throw new Error("Method not implemented.");
    }
    async displayDish(dish, user) {
        throw new Error("Method not implemented.");
    }
}
exports.InMemoryDiscountAdapter = InMemoryDiscountAdapter;
