"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const discount_generator_1 = __importDefault(require("../../generators/discount.generator"));
const index_1 = require("./../../../adapters/index");
describe("PromotionCodes", function () {
    let dishes;
    let promoAdapter = index_1.Adapter.getPromotionAdapter();
    let order;
    before(async () => {
        dishes = await Dish.find({});
        let promoCodeDiscount = (0, discount_generator_1.default)({
            concept: ["origin"],
            id: 'promocode-flat-100',
            isJoint: true,
            name: 'Promocode flat 100',
            badge: 'test',
            isPublic: false,
            configDiscount: {
                discountType: "flat",
                discountAmount: 0,
                promotionFlatDiscount: 100,
                dishes: [],
                groups: [],
                excludeModifiers: true
            },
        });
        promoAdapter.deleteAllPromotions();
        promoAdapter.addPromotionHandler(promoCodeDiscount);
        //configuredPromotion = new ConfiguredPromotion(promoCodeDiscount, promoCodeDiscount.configDiscount)
    });
    after(() => {
        promoAdapter.deleteAllPromotions();
    });
    it("Add promocode in order && valid", async function () {
        const promocode = await PromotionCode.create({
            code: "TEST100",
            promotion: "promocode-flat-100"
        });
        order = await Order.create({ id: "promocode-test" }).fetch();
        await Order.applyPromotionCode({ id: order.id }, "TEST100");
        await Order.addDish({ id: order.id }, dishes[0], 3, [], "", "user");
        let result = await Order.findOne(order.id);
        (0, chai_1.expect)(result.discountTotal).to.equal(100);
        (0, chai_1.expect)(result.total).to.equal(200.3);
    });
    it("Clear promotional code", async function () {
        await Order.applyPromotionCode({ id: order.id }, null);
        let result = await Order.findOne(order.id);
        (0, chai_1.expect)(result.discountTotal).to.equal(0);
        (0, chai_1.expect)(result.total).to.equal(300.3);
    });
});
