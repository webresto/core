"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dish_generator_1 = __importDefault(require("../../generators/dish.generator"));
const chai_1 = require("chai");
const promotionAdapter_1 = require("./../../../adapters/promotion/default/promotionAdapter");
const findModelInstance_1 = __importDefault(require("./../../../libs/findModelInstance"));
const stringsInArray_1 = require("../../../libs/stringsInArray");
const configuredPromotion_1 = __importDefault(require("../../../adapters/promotion/default/configuredPromotion"));
const decimal_js_1 = __importDefault(require("decimal.js"));
describe('Discount_Empty', function () {
    after(async function () {
        await Promotion.destroy({});
    });
    let discountEx = {
        id: "1-id",
        configDiscount: {
            discountType: "flat",
            discountAmount: 1.33,
            dishes: ["a"],
            groups: ["a"],
            excludeModifiers: true
        },
        name: "1-name",
        description: "string",
        concept: [],
        condition: (arg) => {
            if ((0, findModelInstance_1.default)(arg) === "Order" && (0, stringsInArray_1.stringsInArray)(arg.concept, discountEx.concept)) {
                // Order.populate()
                //discountEx.concept.includes(arg.concept)
                return true;
            }
            return false;
        },
        action: async (order) => {
            return await configuredPromotion.applyPromotion(order.id);
        },
        isPublic: true,
        isJoint: true,
        // sortOrder: 0,
        displayGroup: function (group, user) {
            if (this.isJoint === true && this.isPublic === true) {
                group.discountAmount = promotionAdapter_1.Adapter.getPromotionAdapter().promotions[this.id].configDiscount.discountAmount;
                group.discountType = promotionAdapter_1.Adapter.getPromotionAdapter().promotions[this.id].configDiscount.discountType;
            }
            return group;
        },
        displayDish: function (dish, user) {
            if (this.isJoint === true && this.isPublic === true) {
                // 
                dish.discountAmount = promotionAdapter_1.Adapter.getPromotionAdapter().promotions[this.id].configDiscount.discountAmount;
                dish.discountType = promotionAdapter_1.Adapter.getPromotionAdapter().promotions[this.id].configDiscount.discountType;
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
    let configuredPromotion;
    let groupsId = [];
    before(async () => {
        configuredPromotion = new configuredPromotion_1.default(discountEx, discountEx.configDiscount);
        const groups = await Group.find({});
        groupsId = groups.map(group => group.id);
        discountEx.configDiscount.groups = groupsId;
    });
    it("discount empty concept", async function () {
        let promotionAdapter = promotionAdapter_1.Adapter.getPromotionAdapter();
        let order = await Order.create({ id: "add-dish-empty-concept" }).fetch();
        let dish1 = await Dish.createOrUpdate((0, dish_generator_1.default)({ name: "test dish", price: 10.1, concept: "", parentGroup: groupsId[0] }));
        let dish2 = await Dish.createOrUpdate((0, dish_generator_1.default)({ name: "test fish", price: 15.2, concept: "", parentGroup: groupsId[0] }));
        discountEx.configDiscount.dishes.push(dish1.id);
        discountEx.configDiscount.dishes.push(dish2.id);
        await promotionAdapter.addPromotionHandler(discountEx);
        await Order.addDish({ id: order.id }, dish1, 5, [], "", "test");
        await Order.addDish({ id: order.id }, dish2, 4, [], "", "test");
        let result = await Order.findOne(order.id);
        (0, chai_1.expect)(result.discountTotal).to.equal(11.97);
    });
    it("discount empty concept but order with concept", async function () {
        let promotionAdapter = promotionAdapter_1.Adapter.getPromotionAdapter();
        let order = await Order.create({ id: "add-dish-empty" }).fetch();
        await Order.updateOne({ id: order.id }, { concept: "origin", user: "user" });
        let dish1 = await Dish.createOrUpdate((0, dish_generator_1.default)({ name: "test dish", price: 10.1, concept: "a", parentGroup: groupsId[0] }));
        let dish2 = await Dish.createOrUpdate((0, dish_generator_1.default)({ name: "test fish", price: 15.2, concept: "", parentGroup: groupsId[0] }));
        discountEx.configDiscount.dishes.push(dish1.id);
        discountEx.configDiscount.dishes.push(dish2.id);
        await promotionAdapter.addPromotionHandler(discountEx);
        await Order.addDish({ id: order.id }, dish1, 5, [], "", "test");
        await Order.addDish({ id: order.id }, dish2, 4, [], "", "test");
        let result = await Order.findOne(order.id);
        (0, chai_1.expect)(result.discountTotal).to.equal(11.97);
    });
});
