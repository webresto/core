"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const adapters_1 = require("../../../adapters");
const chai_1 = require("chai");
const promotionAdapter_1 = require("../../../adapters/promotion/default/promotionAdapter");
const dish_generator_1 = __importDefault(require("../../generators/dish.generator"));
const stringsInArray_1 = require("../../../libs/stringsInArray");
const findModelInstance_1 = __importDefault(require("../../../libs/findModelInstance"));
const discount_generator_1 = __importDefault(require("../../generators/discount.generator"));
const configuredPromotion_1 = __importDefault(require("../../../adapters/promotion/default/configuredPromotion"));
const decimal_js_1 = __importDefault(require("decimal.js"));
describe("Promotion adapter integration test", function () {
    this.timeout(60000);
    before(async function () {
    });
    after(async function () {
        await Promotion.destroy({});
    });
    it("Configured discount total: 10% for all group", async () => {
        // // If item is added, then see that it stood in line.
        // // Pass the test response of Messaja
        // // if the Cost is added, he set
        // // if item is borrowed from him
        // var dishes = await Dish.find({})
        // let discountAdapter:AbstractPromotionAdapter = PromotionAdapter.initialize()
        let discountAdapter = adapters_1.Adapter.getPromotionAdapter();
        let order = await Order.create({ id: "configured-promotion-integration-testa" }).fetch();
        await Order.updateOne({ id: order.id }, { concept: "road", user: "user" });
        const groups = await Group.find({});
        const groupsId = groups.map(group => group.id);
        let dish1 = await Dish.createOrUpdate((0, dish_generator_1.default)({ name: "test dish", price: 10.1, concept: "road", parentGroup: groupsId[0] }));
        let dish2 = await Dish.createOrUpdate((0, dish_generator_1.default)({ name: "test fish", price: 15.2, concept: "road", parentGroup: groupsId[0] }));
        let dishes = await Dish.find({});
        const dishesId = dishes.map(dish => dish.id);
        let config = {
            discountType: "percentage",
            discountAmount: 10,
            dishes: dishesId,
            groups: groupsId,
            excludeModifiers: true
        };
        let promotion10Percent = new configuredPromotion_1.default({
            concept: ["road"],
            id: 'aa2-id',
            isJoint: true,
            name: 'awdawd',
            isPublic: true,
            configDiscount: config,
            description: "aaa",
            externalId: "externalID"
        }, config);
        await discountAdapter.addPromotionHandler(promotion10Percent);
        await Order.addDish({ id: order.id }, dish1, 5, [], "", "test");
        await Order.addDish({ id: order.id }, dish2, 4, [], "", "test");
        let result = await Order.findOne(order.id);
        // console.log(result)
        (0, chai_1.expect)(result.discountTotal).to.equal(11.13);
    });
    it("IsJoint: false configured discount over total discount for specific dish", async () => {
        // check specific group and dish for joint:false
        let discountAdapter = adapters_1.Adapter.getPromotionAdapter();
        let order = await Order.create({ id: "configured-promotion-integration-test-joint-false" }).fetch();
        await Order.updateOne({ id: order.id }, { concept: "jointfalse", user: "user" });
        const groups = await Group.find({});
        const groupsId = groups.map(group => group.id);
        let dish1 = await Dish.createOrUpdate((0, dish_generator_1.default)({ name: "test dish", price: 10.1, concept: "jointfalse", parentGroup: groupsId[0] }));
        let dish2 = await Dish.createOrUpdate((0, dish_generator_1.default)({ name: "test fish", price: 15.2, concept: "jointfalse", parentGroup: groupsId[0] }));
        let dishes = await Dish.find({});
        const dishesId = dishes.map(dish => dish.id);
        let config = {
            discountType: "percentage",
            discountAmount: 10,
            dishes: dishesId,
            groups: groupsId,
            excludeModifiers: true
        };
        let promotion10 = new configuredPromotion_1.default({
            concept: ["jointfalse"],
            id: 'config2-id',
            isJoint: false,
            name: 'awdawd',
            isPublic: true,
            configDiscount: config,
            description: "aaa",
            externalId: "externalID2"
        }, config);
        let promotion1flat = (0, discount_generator_1.default)({
            concept: ["jointfalse"],
            id: 'aa22-id',
            isJoint: true,
            name: 'awdaawd',
            isPublic: true,
            configDiscount: {
                discountType: "flat",
                discountAmount: 1,
                dishes: dishesId,
                groups: groupsId,
                excludeModifiers: true
            },
        });
        await discountAdapter.addPromotionHandler(promotion10);
        await discountAdapter.addPromotionHandler(promotion1flat);
        await Order.addDish({ id: order.id }, dish1, 5, [], "", "test");
        await Order.addDish({ id: order.id }, dish2, 4, [], "", "test");
        let result = await Order.findOne(order.id);
        (0, chai_1.expect)(result.discountTotal).to.equal(11.13);
    });
    it("configured discount for specific dish/group, over total discount with sortOrder", async () => {
        let discountAdapter = adapters_1.Adapter.getPromotionAdapter();
        const groups = await Group.find({});
        const groupsId = groups.map(group => group.id);
        let order = await Order.create({ id: "configured-promotion-integration-test-diff" }).fetch();
        await Order.updateOne({ id: order.id }, { concept: "amongus", user: "user" });
        let dish1 = await Dish.createOrUpdate((0, dish_generator_1.default)({ name: "test dish", price: 10.1, concept: "amongus", parentGroup: groupsId[0] }));
        let dish2 = await Dish.createOrUpdate((0, dish_generator_1.default)({ name: "test fish", price: 15.2, concept: "amongus", parentGroup: groupsId[1] }));
        let dishes = await Dish.find({});
        const dishesId = dishes.map(dish => dish.id);
        let config = {
            discountType: "percentage",
            discountAmount: 10,
            dishes: dishesId,
            groups: groupsId,
            excludeModifiers: true
        };
        let config2 = {
            discountType: "flat",
            discountAmount: 1,
            dishes: [dish1.id],
            groups: groupsId,
            excludeModifiers: true
        };
        let createInModelPromotion = {
            id: 'config2addaw-idawdawd',
            isJoint: false,
            name: "Promotion",
            isPublic: true,
            isDeleted: false,
            createdByUser: true,
            description: "aaa",
            concept: ["amongus"],
            configDiscount: config2,
            sortOrder: -1,
            externalId: "Promotion3",
            worktime: null,
            enable: true
        };
        await Promotion.createOrUpdate(createInModelPromotion);
        // TODO: check Promotion.createOrUpdate({createdByUser: true})
        let promotion10 = new configuredPromotion_1.default({
            concept: ["amongus"],
            id: 'config2addawawdaw-id',
            isJoint: false,
            name: 'Promotion',
            isPublic: true,
            configDiscount: config,
            description: "aaa",
            externalId: "externalID2awdawd"
        }, config);
        await discountAdapter.addPromotionHandler(promotion10);
        await Order.addDish({ id: order.id }, dish1, 5, [], "", "test");
        await Order.addDish({ id: order.id }, dish2, 4, [], "", "test");
        let result = await Order.findOne(order.id);
        // console.log(result)
        (0, chai_1.expect)(result.discountTotal).to.equal(5);
    });
    //   /**
    //    * Here need add 2 discount for cross group and check what is stop after first found
    //    */
    it("Check flat and percentage discount for specific dish/group", async () => {
        let discountAdapter = adapters_1.Adapter.getPromotionAdapter();
        let order = await Order.create({ id: "configured-promotion-integration-specific" }).fetch();
        await Order.updateOne({ id: order.id }, { concept: "specific", user: "user" });
        const groups = await Group.find({});
        const groupsId = groups.map(group => group.id);
        let dish1 = await Dish.createOrUpdate((0, dish_generator_1.default)({ name: "test dish", price: 10.1, concept: "specific", parentGroup: groupsId[0] }));
        let dish2 = await Dish.createOrUpdate((0, dish_generator_1.default)({ name: "test fish", price: 15.2, concept: "specific", parentGroup: groupsId[1] }));
        let dishes = await Dish.find({});
        const dishesId = dishes.map(dish => dish.id);
        let flatDiscount = (0, discount_generator_1.default)({
            concept: ["specific"],
            id: 'flat2-id',
            isJoint: true,
            name: 'awdaawd',
            isPublic: true,
            configDiscount: {
                discountType: "flat",
                discountAmount: 1,
                dishes: dishesId,
                groups: groupsId,
                excludeModifiers: true
            },
        });
        let percentDiscount = (0, discount_generator_1.default)({
            concept: ["specific"],
            id: 'percent2-id',
            isJoint: true,
            name: 'awdaawd',
            isPublic: true,
            configDiscount: {
                discountType: "percentage",
                discountAmount: 10,
                dishes: [dish1.id],
                groups: groupsId,
                excludeModifiers: true
            },
        });
        let percentDiscount2 = (0, discount_generator_1.default)({
            concept: ["specific"],
            id: 'percent2-idawdawd',
            isJoint: true,
            name: 'awdaawawdd',
            isPublic: true,
            configDiscount: {
                discountType: "percentage",
                discountAmount: 10,
                dishes: [dish1.id],
                groups: [groupsId[1]],
                excludeModifiers: true
            },
        });
        let percentDiscount3 = (0, discount_generator_1.default)({
            concept: ["specific"],
            id: 'percent2-idawdawd',
            isJoint: true,
            name: 'awdaawawdd',
            isPublic: true,
            configDiscount: {
                discountType: "percentage",
                discountAmount: 10,
                dishes: [dish1.id, dish2.id],
                groups: [groupsId[1]],
                excludeModifiers: true
            },
        });
        await discountAdapter.addPromotionHandler(flatDiscount);
        await discountAdapter.addPromotionHandler(percentDiscount);
        await discountAdapter.addPromotionHandler(percentDiscount2);
        await discountAdapter.addPromotionHandler(percentDiscount3);
        await Order.addDish({ id: order.id }, dish1, 5, [], "", "test");
        await Order.addDish({ id: order.id }, dish2, 4, [], "", "test");
        order = await Order.findOne(order.id);
        (0, chai_1.expect)(order.discountTotal).to.equal(20.13);
    });
    it("Promotion states should passed in order discount", async () => {
        let discountAdapter = adapters_1.Adapter.getPromotionAdapter();
        let order = await Order.create({ id: "configured-promotion-integration-states" }).fetch();
        await Order.updateOne({ id: order.id }, { concept: "PromotionStatess", user: "user" });
        const groups = await Group.find({});
        const groupsId = groups.map(group => group.id);
        let dish1 = await Dish.createOrUpdate((0, dish_generator_1.default)({ name: "test dish", price: 10.1, concept: "PromotionStatess", parentGroup: groupsId[0] }));
        let dish2 = await Dish.createOrUpdate((0, dish_generator_1.default)({ name: "test fish", price: 15.2, concept: "PromotionStatess", parentGroup: groupsId[0] }));
        let dishes = await Dish.find({});
        const dishesId = dishes.map(dish => dish.id);
        let promotion10state = (0, discount_generator_1.default)({
            concept: ["PromotionStatess"],
            id: 'flat2aaawa-id',
            isJoint: true,
            name: 'awdaawad',
            isPublic: true,
            configDiscount: {
                discountType: "flat",
                discountAmount: 1,
                dishes: dishesId,
                groups: groupsId,
                excludeModifiers: true
            },
        });
        await discountAdapter.addPromotionHandler(promotion10state);
        await Order.addDish({ id: order.id }, dish1, 5, [], "", "test");
        await Order.addDish({ id: order.id }, dish2, 4, [], "", "test");
        let res = await Order.findOne(order.id);
        // await discountAdapter.processOrder(res)
        // res = await Order.findOne(order.id) 
        let example = {
            message: `Discount generator description`,
            type: "configured-promotion",
            state: {}
        };
        (0, chai_1.expect)(res.discountTotal).to.equal(9);
        (0, chai_1.expect)(res.promotionState[0].message).to.equal(example.message);
        (0, chai_1.expect)(res.promotionState[0].type).to.equal(example.type);
        // expect(order.promotionState[0].state).to.equal(example.state);
    });
    // it("Check display group and display dish", async ()=>{
    //     await Dish.display({id: "my-displayed-dish"})
    // })
    it("Check prepend recursion discount", async () => {
        // for call recursion we should add dish from action in promotionHandler
        const groups = await Group.find({});
        const groupsId = groups.map(group => group.id);
        let order = await Order.create({ id: "configured-promotion-integration-recursion" }).fetch();
        await Order.updateOne({ id: order.id }, { concept: "recursion", user: "user" });
        let dish1 = await Dish.createOrUpdate((0, dish_generator_1.default)({ name: "test dish", price: 10.1, concept: "recursion", parentGroup: groupsId[0] }));
        let dish2 = await Dish.createOrUpdate((0, dish_generator_1.default)({ name: "test fish", price: 15.2, concept: "recursion", parentGroup: groupsId[0] }));
        let discountEx1 = {
            id: "1aw42-idaaa",
            configDiscount: {
                discountType: "flat",
                discountAmount: 1,
                dishes: [dish1.id, dish2.id],
                groups: groupsId,
                excludeModifiers: true
            },
            name: "1124-name",
            description: "sawdad",
            concept: ["recursion"],
            condition: (arg) => {
                if ((0, findModelInstance_1.default)(arg) === "Order" && (0, stringsInArray_1.stringsInArray)(arg.concept, discountEx1.concept)) {
                    return true;
                }
                if ((0, findModelInstance_1.default)(arg) === "Dish" && (0, stringsInArray_1.stringsInArray)(arg.concept, discountEx1.concept)) {
                    // TODO: check if includes in IconfigDish
                    return true;
                }
                if ((0, findModelInstance_1.default)(arg) === "Group" && (0, stringsInArray_1.stringsInArray)(arg.concept, discountEx1.concept)) {
                    // TODO: check if includes in IconfigG
                    return true;
                }
                return false;
            },
            action: async (order) => {
                // console.log("ACTION ================awdawdawd")
                let dish1 = await Dish.createOrUpdate((0, dish_generator_1.default)({ name: "test fish", price: 15.2, concept: "recursion", parentGroup: groupsId[0] }));
                discountEx1.configDiscount.dishes.push(dish1.id);
                await Order.addDish({ id: order.id }, dish1, 5, [], "", "test");
                let configPromotion = new configuredPromotion_1.default(discountEx1, discountEx1.configDiscount);
                return await configPromotion.applyPromotion(order.id);
            },
            isPublic: true,
            isJoint: true,
            // sortOrder: 0,
            displayGroup: function (group, user) {
                if (this.isJoint === true && this.isPublic === true) {
                    group.discountAmount = promotionAdapter_1.PromotionAdapter.promotions[this.id].configDiscount.discountAmount;
                    group.discountType = promotionAdapter_1.PromotionAdapter.promotions[this.id].configDiscount.discountType;
                }
                return group;
            },
            displayDish: function (dish, user) {
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
            },
            externalId: "1-externalIdaw",
        };
        let discountAdapter = adapters_1.Adapter.getPromotionAdapter();
        await discountAdapter.addPromotionHandler(discountEx1);
        await Order.addDish({ id: order.id }, dish1, 5, [], "", "test");
        // 5 dishes + 5 from action
        await Order.addDish({ id: order.id }, dish2, 4, [], "", "test");
        // 4 dishes + 5 from action
        let result = await Order.findOne(order.id);
        (0, chai_1.expect)(result.discountTotal).to.equal(19);
    });
});
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}