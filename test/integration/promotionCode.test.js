"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const adapters_1 = require("../../adapters");
const chai_1 = require("chai");
const dish_generator_1 = __importDefault(require("../generators/dish.generator"));
describe("Promotion code integration test", function () {
    this.timeout(60000);
    let promotionAdapter;
    let promoCodeDiscount;
    let dish1 = null;
    let dish2 = null;
    before(async function () {
        promotionAdapter = adapters_1.Adapter.getPromotionAdapter();
        const discountGenerator = require(__dirname + "/../generators/discount.generator").default;
        promoCodeDiscount = discountGenerator({
            concept: ["origin", "road"],
            id: 'promo-flat-123',
            isJoint: true,
            name: 'Promocode TEST123',
            badge: 'test',
            isPublic: false,
            createdByUser: true,
            configDiscount: {
                discountType: "flat",
                discountAmount: 0,
                promotionFlatDiscount: 1.45,
                dishes: [],
                groups: [],
                excludeModifiers: true
            },
        });
        await Promotion.createOrUpdate(promoCodeDiscount);
        await PromotionCode.findOrCreate({ id: "promocode-test-123" }, {
            id: "promocode-test-123",
            description: "test 123",
            code: "TEST123"
        });
        //@ts-ignore
        await PromotionCode.addToCollection("promocode-test-123", "promotion", 'promo-flat-123');
        const groups = await Group.find({});
        const groupsId = groups.map(group => group.id);
        dish1 = await Dish.createOrUpdate((0, dish_generator_1.default)({ name: "test dish for promotion", price: 10.1, concept: "road", parentGroup: groupsId[0] }));
        dish2 = await Dish.createOrUpdate((0, dish_generator_1.default)({ name: "test fish for promotion", price: 15.2, concept: "road", parentGroup: groupsId[0] }));
    });
    after(async function () {
        await Promotion.destroy({});
    });
    it("Base countur promocode with flat discount (create new + apply)", async () => {
        let order = await Order.create({ id: "promotion-code-integration-test" }).fetch();
        await Order.updateOne({ id: order.id }, { concept: "road", user: "user" });
        await Order.addDish({ id: order.id }, dish1, 5, [], "", "user");
        await Order.addDish({ id: order.id }, dish2, 4, [], "", "user");
        // VALID PROMOCODE
        await Order.applyPromotionCode({ id: order.id }, "TEST123");
        let result = await Order.findOne({ id: order.id });
        (0, chai_1.expect)(result.promotionCodeString).to.equal("TEST123");
        (0, chai_1.expect)(result.discountTotal).to.equal(1.45);
        (0, chai_1.expect)(result.total).to.equal(109.85);
        (0, chai_1.expect)(result.basketTotal).to.equal(111.3);
        // CLEAR PROMOCODE
        await Order.applyPromotionCode({ id: order.id }, null);
        result = await Order.findOne({ id: order.id });
        (0, chai_1.expect)(result.discountTotal).to.equal(0);
        (0, chai_1.expect)(result.total).to.equal(111.3);
        // NOT VALID PROMOCODE
        await Order.applyPromotionCode({ id: order.id }, "WINTER2024NHATRANG");
        result = await Order.findOne({ id: order.id });
        (0, chai_1.expect)(result.discountTotal).to.equal(0);
        (0, chai_1.expect)(result.total).to.equal(111.3);
        (0, chai_1.expect)(result.promotionCodeCheckValidTill).to.equal(null);
        (0, chai_1.expect)(result.promotionCodeString).to.equal("WINTER2024NHATRANG");
        (0, chai_1.expect)(result.promotionCode).to.equal(null);
        //APPLY PROMOCODE AGAIN
        await Order.applyPromotionCode({ id: order.id }, "TEST123");
        result = await Order.findOne({ id: order.id });
        (0, chai_1.expect)(result.promotionCodeString).to.equal("TEST123");
        (0, chai_1.expect)(result.discountTotal).to.equal(1.45);
        (0, chai_1.expect)(result.total).to.equal(109.85);
        (0, chai_1.expect)(result.basketTotal).to.equal(111.3);
    });
    it("Percentage discount by promocode (Hot change existing + apply)", async () => {
        let a = await Promotion.update({ id: "promo-flat-123" }, { configDiscount: {
                discountType: "percentage",
                discountAmount: 10,
                promotionFlatDiscount: 0,
                dishes: [],
                groups: [],
                excludeModifiers: true
            } }).fetch();
        let order = await Order.create({ id: "promotion-hot-change-integration-test" }).fetch();
        await Order.addDish({ id: order.id }, dish1, 5, [], "", "user");
        await Order.addDish({ id: order.id }, dish2, 4, [], "", "user");
        // VALID PROMOCODE
        await Order.applyPromotionCode({ id: order.id }, "TEST123");
        let result = await Order.findOne({ id: order.id });
        (0, chai_1.expect)(result.discountTotal).to.equal(11.13);
    });
});