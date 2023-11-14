"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const adapters_1 = require("../../../adapters");
const chai_1 = require("chai");
const findModelInstance_1 = __importDefault(require("./../../../libs/findModelInstance"));
const decimal_js_1 = __importDefault(require("decimal.js"));
describe('Create_Discount', function () {
    let promotionAdapter;
    before(async () => {
        promotionAdapter = adapters_1.Adapter.getPromotionAdapter();
    });
    it("Create discount test", async function () {
        let discountEx = {
            id: "1-id",
            configDiscount: {
                discountType: "flat",
                discountAmount: 1,
                dishes: [],
                groups: [],
                excludeModifiers: true
            },
            badge: 'test',
            name: "1-name",
            description: "string",
            concept: [],
            condition: (arg) => {
                if ((0, findModelInstance_1.default)(arg) === "Order" && discountEx.concept.includes(arg.concept)) {
                    // Order.populate()
                    return true;
                }
                if ((0, findModelInstance_1.default)(arg) === "Dish" && discountEx.concept.includes(arg.concept)) {
                    // TODO: check if includes in IconfigDish
                    return true;
                }
                if ((0, findModelInstance_1.default)(arg) === "Group" && discountEx.concept.includes(arg.concept)) {
                    // TODO: check if includes in IconfigG
                    return true;
                }
                return false;
            },
            action: () => Promise.resolve({
                message: "",
                state: {},
                type: "test"
            }),
            isPublic: true,
            isJoint: true,
            // sortOrder: 0,
            displayGroup: function (group, user) {
                if (this.isJoint === true && this.isPublic === true) {
                    group.discountAmount = promotionAdapter.promotions[this.id].configDiscount.discountAmount;
                    group.discountType = promotionAdapter.promotions[this.id].configDiscount.discountType;
                }
                return group;
            },
            displayDish: function (dish, user) {
                if (this.isJoint === true && this.isPublic === true) {
                    // 
                    dish.discountAmount = promotionAdapter.promotions[this.id].configDiscount.discountAmount;
                    dish.discountType = promotionAdapter.promotions[this.id].configDiscount.discountType;
                    dish.oldPrice = dish.price;
                    dish.price = this.configDiscount.discountType === "flat"
                        ? new decimal_js_1.default(dish.price).minus(+this.configDiscount.discountAmount).toNumber()
                        : new decimal_js_1.default(dish.price)
                            .mul(+this.configDiscount.discountAmount / 100)
                            .toNumber();
                }
                return dish;
            },
            externalId: "1-externalId",
        };
        await promotionAdapter.addPromotionHandler(discountEx);
        let discountById = promotionAdapter.getPromotionHandlerById(discountEx.id);
        // let byConceptE = await DiscountAdapter.getAllConcept(["E"])
        // let byConceptA = await DiscountAdapter.getAllConcept(["a"])
        (0, chai_1.expect)(discountById.id).to.equal(discountEx.id);
    });
});
