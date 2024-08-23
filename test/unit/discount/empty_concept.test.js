"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dish_generator_1 = __importDefault(require("../../generators/dish.generator"));
const chai_1 = require("chai");
const findModelInstance_1 = __importDefault(require("../../../libs/findModelInstance"));
const index_1 = require("../../../adapters/index");
const Group_1 = __importDefault(require("../../../models/Group"));
const stringsInArray_1 = require("../../../libs/stringsInArray");
const configuredPromotion_1 = __importDefault(require("../../../adapters/promotion/default/configuredPromotion"));
const decimal_js_1 = __importDefault(require("decimal.js"));
describe('Discount_Empty', function () {
    after(async function () {
        // await Promotion.destroy({})
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
        badge: 'test',
        name: "1-name",
        description: "string",
        concept: [""],
        condition: (arg) => {
            if ((0, findModelInstance_1.default)(arg) === "Order" && (discountEx.concept[0] === undefined || discountEx.concept[0] === "")
                ? true : (0, stringsInArray_1.someInArray)(arg.concept, discountEx.concept)) {
                // Order.populate()
                //discountEx.concept.includes(arg.concept)
                return true;
            }
            return false;
        },
        action: async (order) => {
            return await configuredPromotion.applyPromotion(order);
        },
        isPublic: true,
        isJoint: true,
        // sortOrder: 0,
        displayGroup: function (group, user) {
            if (this.isJoint === true && this.isPublic === true) {
                group.discountAmount = index_1.Adapter.getPromotionAdapter().promotions[this.id].configDiscount.discountAmount;
                group.discountType = index_1.Adapter.getPromotionAdapter().promotions[this.id].configDiscount.discountType;
            }
            return group;
        },
        displayDish: function (dish, user) {
            if (this.isJoint === true && this.isPublic === true) {
                //
                dish.discountAmount = index_1.Adapter.getPromotionAdapter().promotions[this.id].configDiscount.discountAmount;
                dish.discountType = index_1.Adapter.getPromotionAdapter().promotions[this.id].configDiscount.discountType;
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
    let promotionAdapter;
    before(async () => {
        // Stop all
        await Promotion.update({}, { enable: false }).fetch();
        // define
        promotionAdapter = index_1.Adapter.getPromotionAdapter();
        configuredPromotion = new configuredPromotion_1.default(discountEx, discountEx.configDiscount);
        const groups = await Group_1.default.find({});
        groupsId = groups.map(group => group.id);
        discountEx.configDiscount.groups = groupsId;
        await Promotion.update({ id: "1-id" }, { enable: true }).fetch();
    });
    it("discount empty concept", async function () {
        let order = await Order.create({ id: "add-dish-empty-concept" }).fetch();
        await Order.updateOne({ id: order.id }, { user: "user" });
        let dish1 = await Dish.createOrUpdate((0, dish_generator_1.default)({ name: "test dish", price: 10.1, concept: "a", parentGroup: groupsId[0] }));
        let dish2 = await Dish.createOrUpdate((0, dish_generator_1.default)({ name: "test fish", price: 15.2, concept: "a", parentGroup: groupsId[0] }));
        discountEx.configDiscount.dishes.push(dish1.id);
        discountEx.configDiscount.dishes.push(dish2.id);
        await promotionAdapter.addPromotionHandler(discountEx);
        await Order.addDish({ id: order.id }, dish1, 5, [], "", "user");
        await Order.addDish({ id: order.id }, dish2, 4, [], "", "user");
        let result = await Order.findOne(order.id);
        (0, chai_1.expect)(result.discountTotal).to.equal(11.97);
    });
    // TODO: move INTEGRATION
    it("discount empty concept but order with concept", async function () {
        let order = await Order.create({ id: "empty-concept" }).fetch();
        await Order.updateOne({ id: order.id }, { user: "user" });
        let dish1 = await Dish.createOrUpdate((0, dish_generator_1.default)({ name: "test dish", price: 10.1, concept: "a", parentGroup: groupsId[0] }));
        let dish2 = await Dish.createOrUpdate((0, dish_generator_1.default)({ name: "test fish", price: 15.2, concept: "a", parentGroup: groupsId[0] }));
        discountEx.configDiscount.dishes.push(dish1.id);
        discountEx.configDiscount.dishes.push(dish2.id);
        await promotionAdapter.addPromotionHandler(discountEx);
        await Order.addDish({ id: order.id }, dish1, 5, [], "", "user");
        await Order.addDish({ id: order.id }, dish2, 4, [], "", "user");
        let result = await Order.findOne(order.id);
        // console.log(JSON.stringify(result, null, 2))
        (0, chai_1.expect)(result.discountTotal).to.equal(11.97);
    });
});
