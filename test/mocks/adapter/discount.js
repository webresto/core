"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryDiscountAdapter = void 0;
const AbstractPromotion_1 = require("../../../adapters/promotion/AbstractPromotion");
const findModelInstance_1 = require("../../../libs/findModelInstance");
const stringsInArray_1 = require("../../../libs/stringsInArray");
const configuredPromotion_1 = require("../../../adapters/promotion/default/configuredPromotion");
class InMemoryDiscountAdapter extends AbstractPromotion_1.default {
    constructor() {
        super(...arguments);
        this.id = "aaaa";
        this.isJoint = true;
        this.name = "New Year";
        this.isPublic = false;
        this.description = "some text";
        this.concept = ["NewYear", "Happy Birthday", "origin"];
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
