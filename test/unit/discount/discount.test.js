"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dish_generator_1 = __importDefault(require("../../generators/dish.generator"));
const chai_1 = require("chai");
// import AbstractPromotionHandler from '@webresto/core/adapters/discount/AbstractPromotion';
const discount_1 = require("../../mocks/adapter/discount");
const discount_generator_1 = __importDefault(require("../../generators/discount.generator"));
const group_generator_1 = __importDefault(require("../../generators/group.generator"));
const promotionAdapter_1 = require("./../../../adapters/promotion/default/promotionAdapter");
const findModelInstance_1 = __importDefault(require("./../../../libs/findModelInstance"));
const index_1 = require("./../../../adapters/index");
const stringsInArray_1 = require("../../../libs/stringsInArray");
const configuredPromotion_1 = __importDefault(require("../../../adapters/promotion/default/configuredPromotion"));
const decimal_js_1 = __importDefault(require("decimal.js"));
describe('Discount', function () {
    // TODO: tests throw get adapter
    // let order: Order;
    // let dishes: Dish[];
    // let fullOrder: Order;
    after(async function () {
        await Promotion.destroy({});
    });
    let discInMemory = new discount_1.InMemoryDiscountAdapter;
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
        concept: ["origin", "clear", "Happy Birthday", "3dif"],
        condition: (arg) => {
            if ((0, findModelInstance_1.default)(arg) === "Order" && (0, stringsInArray_1.stringsInArray)(arg.concept, discountEx.concept)) {
                // Order.populate()
                //discountEx.concept.includes(arg.concept)
                return true;
            }
            if ((0, findModelInstance_1.default)(arg) === "Dish" && (0, stringsInArray_1.stringsInArray)(arg.concept, discountEx.concept)) {
                // TODO: check if includes in IconfigDish
                return true;
            }
            if ((0, findModelInstance_1.default)(arg) === "Group" && (0, stringsInArray_1.stringsInArray)(arg.concept, discountEx.concept)) {
                // TODO: check if includes in IconfigG
                return true;
            }
            return false;
        },
        action: async (order) => {
            // console.log("ACTION ================awdawdawd")
            return await configuredPromotion.applyPromotion(order.id);
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
        externalId: "1-externalId",
    };
    let configuredPromotion;
    let configuredPromotionFromMemory;
    let groupsId = [];
    let disc1 = (0, discount_generator_1.default)({
        concept: ["origin", "3dif"],
        id: 'aa2-id',
        isJoint: true,
        name: 'awdawd',
        isPublic: true,
        configDiscount: {
            discountType: "flat",
            discountAmount: 1,
            dishes: ["Aaa"],
            groups: [],
            excludeModifiers: true
        },
    });
    before(async () => {
        configuredPromotion = new configuredPromotion_1.default(discountEx, discountEx.configDiscount);
        configuredPromotionFromMemory = new configuredPromotion_1.default(discInMemory, discInMemory.configDiscount);
        const groups = await Group.find({});
        groupsId = groups.map(group => group.id);
        discountEx.configDiscount.groups = groupsId;
        discInMemory.configDiscount.groups = groupsId;
        disc1.configDiscount.groups = groupsId;
    });
    it("discount add ", async function () {
        // let a = await Adapter.getDiscountAdapter()
        let promotionAdapter = promotionAdapter_1.PromotionAdapter.initialize();
        await promotionAdapter.addPromotionHandler(discountEx);
        let discount = await Promotion.find({});
        let discountById = await promotionAdapter_1.PromotionAdapter.getPromotionHandlerById(discountEx.id);
        (0, chai_1.expect)(discount[0]).to.be.an("object");
        (0, chai_1.expect)(discountById).to.be.an("object");
    });
    it("discount applyPromotion flat on order", async function () {
        let discountAdapter = promotionAdapter_1.PromotionAdapter.initialize();
        let order = await Order.create({ id: "add-dish-with-discount" }).fetch();
        await Order.updateOne({ id: order.id }, { concept: "origin", user: "user" });
        let dish1 = await Dish.createOrUpdate((0, dish_generator_1.default)({ name: "test dish", price: 10, concept: "origin", parentGroup: groupsId[0] }));
        discountEx.configDiscount.dishes.push(dish1.id);
        await discountAdapter.addPromotionHandler(discountEx);
        await Order.addDish({ id: order.id }, dish1, 5, [], "", "test");
        await promotionAdapter_1.PromotionAdapter.clearOfPromotion(order.id);
        await configuredPromotion.applyPromotion(order.id);
        let result = await Order.findOne(order.id);
        (0, chai_1.expect)(result.discountTotal).to.equal(6.65);
    });
    it("discount applyPromotion flat on order with different dishes", async function () {
        let discountAdapter = promotionAdapter_1.PromotionAdapter.initialize();
        let order = await Order.create({ id: "add-dish-with-discounts" }).fetch();
        await Order.updateOne({ id: order.id }, { concept: "origin", user: "user" });
        let dish1 = await Dish.createOrUpdate((0, dish_generator_1.default)({ name: "test dish", price: 10.1, concept: "origin", parentGroup: groupsId[0] }));
        let dish2 = await Dish.createOrUpdate((0, dish_generator_1.default)({ name: "test fish", price: 15.2, concept: "origin", parentGroup: groupsId[0] }));
        discountEx.configDiscount.dishes.push(dish1.id);
        discountEx.configDiscount.dishes.push(dish2.id);
        await discountAdapter.addPromotionHandler(discountEx);
        await Order.addDish({ id: order.id }, dish1, 5, [], "", "test");
        await Order.addDish({ id: order.id }, dish2, 4, [], "", "test");
        // let result1 = await Dish.findOne(dish1.id)
        await promotionAdapter_1.PromotionAdapter.clearOfPromotion(order.id);
        await configuredPromotion.applyPromotion(order.id);
        let result = await Order.findOne(order.id);
        (0, chai_1.expect)(result.discountTotal).to.equal(11.97);
    });
    it("discount PromotionAdapter-applyToOrder on order with different dishes", async function () {
        let discountAdapter = promotionAdapter_1.PromotionAdapter.initialize();
        let order = await Order.create({ id: "apply-to-ordersa" }).fetch();
        await Order.updateOne({ id: order.id }, { concept: "origin", user: "user" });
        //Decimal check 15.2,  10.1
        let dish1 = await Dish.createOrUpdate((0, dish_generator_1.default)({ name: "test disha", price: 10.1, concept: "clear", parentGroup: groupsId[0] }));
        let dish2 = await Dish.createOrUpdate((0, dish_generator_1.default)({ name: "test fisha", price: 15.2, concept: "clear", parentGroup: groupsId[0] }));
        discountEx.configDiscount.dishes.push(dish1.id);
        discountEx.configDiscount.dishes.push(dish2.id);
        await discountAdapter.addPromotionHandler(discountEx);
        await Order.addDish({ id: order.id }, dish1, 5, [], "", "testa");
        await Order.addDish({ id: order.id }, dish2, 4, [], "", "testa");
        order = await Order.findOne(order.id);
        await discountAdapter.processOrder(order);
        let result = await Order.findOne(order.id); //.populate("dishes");
        // console.log(result)
        // console.log(result, "get discount order")
        (0, chai_1.expect)(result.discountTotal).to.equal(11.97);
        let dish3 = await Dish.createOrUpdate((0, dish_generator_1.default)({ name: "test disha", price: 10, concept: "a", parentGroup: groupsId[0] }));
        let dish4 = await Dish.createOrUpdate((0, dish_generator_1.default)({ name: "test fisha", price: 15, concept: "a", parentGroup: groupsId[0] }));
        await Order.addDish({ id: order.id }, dish3, 5, [], "", "test");
        await Order.addDish({ id: order.id }, dish4, 4, [], "", "test");
        order = await Order.findOne(order.id);
        // console.log(order)
        await discountAdapter.processOrder(order);
        result = await Order.findOne(order.id);
        (0, chai_1.expect)(result.discountTotal).to.equal(11.97);
    });
    it("discount applyPromotion percentage on order with different dishes", async function () {
        let discountAdapter = promotionAdapter_1.PromotionAdapter.initialize();
        let order = await Order.create({ id: "add-dish-with-discountsa" }).fetch();
        await Order.updateOne({ id: order.id }, { concept: "origin", user: "user" });
        let dish1 = await Dish.createOrUpdate((0, dish_generator_1.default)({ name: "test dish", price: 10.1, concept: "origin", parentGroup: groupsId[0] }));
        let dish2 = await Dish.createOrUpdate((0, dish_generator_1.default)({ name: "test fish", price: 15.2, concept: "origin", parentGroup: groupsId[0] }));
        discInMemory.configDiscount.dishes.push(dish1.id);
        discInMemory.configDiscount.dishes.push(dish2.id);
        await discountAdapter.addPromotionHandler(discInMemory);
        await Order.addDish({ id: order.id }, dish1, 5, [], "", "test");
        await Order.addDish({ id: order.id }, dish2, 4, [], "", "test");
        // console.log(discInMemory)
        // let result1 = await Dish.findOne(dish1.id)
        // DiscountAdapter.applyToOrder(order)
        await promotionAdapter_1.PromotionAdapter.clearOfPromotion(order.id);
        await configuredPromotionFromMemory.applyPromotion(order.id);
        let result = await Order.findOne(order.id); //.populate("dishes");
        // console.log(result, "get discount order")
        (0, chai_1.expect)(result.discountTotal).to.equal(11.13);
    });
    it("discount test dishes with flat and percentage types of discounts but same concept", async function () {
        let discountAdapter = promotionAdapter_1.PromotionAdapter.initialize();
        let order = await Order.create({ id: "test-discounts-on-different-types" }).fetch();
        await Order.updateOne({ id: order.id }, { concept: "origin", user: "user" });
        let dish1 = await Dish.createOrUpdate((0, dish_generator_1.default)({ name: "test dish", price: 10.1, concept: "Happy Birthday", parentGroup: groupsId[0] }));
        let dish2 = await Dish.createOrUpdate((0, dish_generator_1.default)({ name: "test fish", price: 15.2, concept: "Happy Birthday", parentGroup: groupsId[0] }));
        let dish3 = await Dish.createOrUpdate((0, dish_generator_1.default)({ name: "test disha", price: 10.1, concept: "Happy Birthday", parentGroup: groupsId[0] }));
        let dish4 = await Dish.createOrUpdate((0, dish_generator_1.default)({ name: "test fisha", price: 15.2, concept: "Happy Birthday", parentGroup: groupsId[0] }));
        let dish5 = await Dish.createOrUpdate((0, dish_generator_1.default)({ name: "test fishw", price: 15.2, concept: "Happy Birthday", parentGroup: groupsId[0] }));
        let dishes = await Dish.find({});
        const dishesId = dishes.map(dish => dish.id);
        discInMemory.configDiscount.dishes = dishesId;
        discountEx.configDiscount.dishes = dishesId;
        await discountAdapter.addPromotionHandler(discInMemory);
        await discountAdapter.addPromotionHandler(discountEx);
        await Order.addDish({ id: order.id }, dish1, 5, [], "", "testa2");
        await Order.addDish({ id: order.id }, dish2, 4, [], "", "tes");
        await Order.addDish({ id: order.id }, dish3, 5, [], "", "testa");
        await Order.addDish({ id: order.id }, dish4, 4, [], "", "test");
        await Order.addDish({ id: order.id }, dish5, 5, [], "", "testa1");
        // 29.86 + 30.59 = 60.45
        order = await Order.findOne(order.id);
        await discountAdapter.processOrder(order);
        let result = await Order.findOne(order.id);
        // console.log(result, "get discount order")
        (0, chai_1.expect)(result.discountTotal).to.equal(60.45);
    });
    it("discount test dishes with flat and percentage types of discounts but different concept", async function () {
        let discountAdapter = promotionAdapter_1.PromotionAdapter.initialize();
        let order = await Order.create({ id: "test-different-types-and-concept" }).fetch();
        await Order.updateOne({ id: order.id }, { concept: "origin", user: "user" });
        let dish1 = await Dish.createOrUpdate((0, dish_generator_1.default)({ name: "test dish", price: 10.1, concept: "Happy Birthday", parentGroup: groupsId[0] }));
        let dish2 = await Dish.createOrUpdate((0, dish_generator_1.default)({ name: "test fish", price: 15.2, concept: "NewYear", parentGroup: groupsId[0] }));
        let dish3 = await Dish.createOrUpdate((0, dish_generator_1.default)({ name: "test disha", price: 10.1, concept: "Happy Birthday", parentGroup: groupsId[0] }));
        let dish4 = await Dish.createOrUpdate((0, dish_generator_1.default)({ name: "test fisha", price: 15.2, concept: "NewYear", parentGroup: groupsId[0] }));
        let dish5 = await Dish.createOrUpdate((0, dish_generator_1.default)({ name: "test fishw", price: 15.2, concept: "Happy Birthday", parentGroup: groupsId[0] }));
        let dishes = await Dish.find({});
        const dishesId = dishes.map(dish => dish.id);
        discInMemory.configDiscount.dishes = dishesId;
        discountEx.configDiscount.dishes = dishesId;
        await discountAdapter.addPromotionHandler(discInMemory);
        await discountAdapter.addPromotionHandler(discountEx);
        await Order.addDish({ id: order.id }, dish1, 5, [], "", "testa2");
        await Order.addDish({ id: order.id }, dish2, 4, [], "", "tes");
        await Order.addDish({ id: order.id }, dish3, 5, [], "", "testa");
        await Order.addDish({ id: order.id }, dish4, 4, [], "", "test");
        await Order.addDish({ id: order.id }, dish5, 5, [], "", "testa1");
        //  17.7 + 12.16 + 19.95 = 49.81
        // await discountAdapter.addPromotionHandler(discInMemory)
        // await discountAdapter.addPromotionHandler(discountEx)
        order = await Order.findOne(order.id);
        await discountAdapter.processOrder(order);
        let result = await Order.findOne(order.id); //.populate("dishes");
        // console.log(result, "get discount order")
        (0, chai_1.expect)(result.discountTotal).to.equal(49.81);
    });
    it("discount test dishes with 3 dif type of discount", async function () {
        let discountAdapter = promotionAdapter_1.PromotionAdapter.initialize();
        let order = await Order.create({ id: "test-3-types-of-discount" }).fetch();
        await Order.updateOne({ id: order.id }, { concept: "3dif", user: "user" });
        let dish1 = await Dish.createOrUpdate((0, dish_generator_1.default)({ name: "test dish2", price: 10.1, concept: "origin", parentGroup: groupsId[0] }));
        let dish2 = await Dish.createOrUpdate((0, dish_generator_1.default)({ name: "test fish3", price: 15.2, concept: "origin", parentGroup: groupsId[0] }));
        let dish3 = await Dish.createOrUpdate((0, dish_generator_1.default)({ name: "test dish4a", price: 10.1, concept: "origin", parentGroup: groupsId[0] }));
        let dish4 = await Dish.createOrUpdate((0, dish_generator_1.default)({ name: "test fisha5", price: 15.2, concept: "NewYear", parentGroup: groupsId[0] }));
        let dish5 = await Dish.createOrUpdate((0, dish_generator_1.default)({ name: "test fishw6", price: 15.2, concept: "NewYear", parentGroup: groupsId[0] }));
        let dishes = await Dish.find({});
        const dishesId = dishes.map(dish => dish.id);
        discInMemory.configDiscount.dishes = dishesId;
        discountEx.configDiscount.dishes = dishesId;
        disc1.configDiscount.dishes = dishesId;
        await discountAdapter.addPromotionHandler(disc1);
        await discountAdapter.addPromotionHandler(discInMemory);
        await discountAdapter.addPromotionHandler(discountEx);
        await Order.addDish({ id: order.id }, dish1, 5, [], "", "testa2");
        await Order.addDish({ id: order.id }, dish2, 4, [], "", "tes");
        await Order.addDish({ id: order.id }, dish3, 5, [], "", "testa");
        await Order.addDish({ id: order.id }, dish4, 4, [], "", "test");
        await Order.addDish({ id: order.id }, dish5, 5, [], "", "testa1");
        // 18.62  + 136.8 - 10% = 18.62 + 13,68 = 32.3+ (101 +60.8) - 10% = 32.3 + 16.18 = 48.48 + 14 = 62.48
        let result = await Order.findOne(order.id); //.populate("dishes");
        (0, chai_1.expect)(result.discountTotal).to.equal(62.48);
    });
    it("discount test displayDish", async function () {
        let discountAdapter = promotionAdapter_1.PromotionAdapter.initialize();
        let order = await Order.create({ id: "test-display-dish" }).fetch();
        await Order.updateOne({ id: order.id }, { concept: "origin", user: "user" });
        let dish1 = await Dish.createOrUpdate((0, dish_generator_1.default)({ name: "test dish2", price: 10.1, concept: "origin", parentGroup: groupsId[0] }));
        let dish2 = await Dish.createOrUpdate((0, dish_generator_1.default)({ name: "test fish3", price: 15.2, concept: "origin", parentGroup: groupsId[0] }));
        discInMemory.configDiscount.dishes.push(dish1.id);
        discInMemory.configDiscount.dishes.push(dish2.id);
        discountEx.configDiscount.dishes.push(dish1.id);
        discountEx.configDiscount.dishes.push(dish2.id);
        await discountAdapter.addPromotionHandler(discInMemory);
        await discountAdapter.addPromotionHandler(discountEx);
        await Order.addDish({ id: order.id }, dish1, 5, [], "", "testa2");
        await Order.addDish({ id: order.id }, dish2, 4, [], "", "tes");
        let display = await Dish.display({ id: dish1.id });
        (0, chai_1.expect)(display[0].id).to.equal(dish1.id);
        (0, chai_1.expect)(display[0].discountAmount).to.equal(1.33);
        (0, chai_1.expect)(display[0].discountType).to.equal("flat");
    });
    it("discount test displayGroup", async function () {
        let discountAdapter = promotionAdapter_1.PromotionAdapter.initialize();
        let order = await Order.create({ id: "test-display-group" }).fetch();
        await Order.updateOne({ id: order.id }, { concept: "origin", user: "user" });
        await discountAdapter.addPromotionHandler(discountEx);
        let group1 = (0, group_generator_1.default)();
        await Group.create(group1);
        let display = await Group.display({ id: group1.id });
        (0, chai_1.expect)(display[0].id).to.equal(group1.id);
        (0, chai_1.expect)(display[0].discountAmount).to.equal(1.33);
        (0, chai_1.expect)(display[0].discountType).to.equal("flat");
    });
    it("discount test clearDiscount", async function () {
        let order = await Order.create({ id: "test-clear-discount" }).fetch();
        await Order.updateOne({ id: order.id }, { concept: "origin", user: "user" });
        let discountAdapter = promotionAdapter_1.PromotionAdapter.initialize();
        let dish1 = await Dish.createOrUpdate((0, dish_generator_1.default)({ name: "test dish", price: 10, concept: "origin", parentGroup: groupsId[0] }));
        discountEx.configDiscount.dishes.push(dish1.id);
        await discountAdapter.addPromotionHandler(discountEx);
        await Order.addDish({ id: order.id }, dish1, 5, [], "", "test");
        // await discountAdapter.processOrder(order)
        await promotionAdapter_1.PromotionAdapter.clearOfPromotion(order.id);
        let result = await Order.findOne(order.id);
        (0, chai_1.expect)(result.discountTotal).to.equal(0);
    });
    it("discount test clearDiscount orderDish", async function () {
        let order = await Order.create({ id: "test-clear-discount-OrderDish" }).fetch();
        await Order.updateOne({ id: order.id }, { concept: "clear", user: "user" });
        let discountAdapter = promotionAdapter_1.PromotionAdapter.initialize();
        let dish1 = await Dish.createOrUpdate((0, dish_generator_1.default)({ name: "test dish", price: 10, concept: "clear", parentGroup: groupsId[0] }));
        discountEx.configDiscount.dishes.push(dish1.id);
        await discountAdapter.addPromotionHandler(discountEx);
        await Order.addDish({ id: order.id }, dish1, 5, [], "", "test");
        // await PromotionAdapter.applyPromotion(order.id, discountEx.configDiscount, discountEx.id)
        // before clear
        let orderDishes1 = await OrderDish.find({ order: order.id }).populate("dish");
        // console.log(orderDishes1)
        (0, chai_1.expect)(orderDishes1[0].discountTotal).to.equal(6.65);
        //after clear
        await promotionAdapter_1.PromotionAdapter.clearOfPromotion(order.id);
        let orderDishes = await OrderDish.find({ order: order.id }).populate("dish");
        // console.log(orderDishes)
        (0, chai_1.expect)(orderDishes[0].discountTotal).to.equal(0);
    });
    it("discount test Adapter.getDiscount ", async function () {
        let order = await Order.create({ id: "test-clear-discount-order-dish-adapter" }).fetch();
        await Order.updateOne({ id: order.id }, { concept: "clear", user: "user" });
        // let promotionAdapter:AbstractPromotionAdapter = DiscountAdapter.initialize()
        let a = index_1.Adapter.getPromotionAdapter();
        let dish1 = await Dish.createOrUpdate((0, dish_generator_1.default)({ name: "test dish", price: 10, concept: "clear", parentGroup: groupsId[0] }));
        discountEx.configDiscount.dishes.push(dish1.id);
        await a.addPromotionHandler(discountEx);
        await Order.addDish({ id: order.id }, dish1, 5, [], "", "test");
        // await discountAdapter.addPromotionHandler(discountEx)
        // await PromotionAdapter.applyPromotion(order.id, discountEx.configDiscount, discountEx.id)
        // before clear
        let orderDishes1 = await OrderDish.find({ order: order.id }).populate("dish");
        // console.log(orderDishes1)
        (0, chai_1.expect)(orderDishes1[0].discountTotal).to.equal(6.65);
        //after clear
        await promotionAdapter_1.PromotionAdapter.clearOfPromotion(order.id);
        let orderDishes = await OrderDish.find({ order: order.id }).populate("dish");
        // console.log(orderDishes)
        (0, chai_1.expect)(orderDishes[0].discountTotal).to.equal(0);
    });
    // if promotion returns
    /**
     * create 5 test groups() and create 3 discounts(1 isJoint=false, 1 for first 3 groups, 1 for 1 group from second case + 1)
     * joint Group check should be skiped this discount from display
     * isjoint don't display
     * check sortOrder last addded for isJoint = true then one by one use display
     * check worktime
     * same for dishes
    */
});
/**
      *
      *
   let orderDish = await OrderDish.find({
     order: order.id,
     dish: dishes[0].id,
   }).sort("createdAt ASC");

 it("addDish same dish increase amount", async function () {
   order = await Order.create({id: "adddish-same-dish-increase-amount-1"}).fetch();
   await Order.addDish({id: order.id}, dishes[0], 2, [], "", "test");
   await Order.addDish({id: order.id}, dishes[0], 3, [], "", "test");
   await Order.addDish({id: order.id}, dishes[0], 1, null, "", "test");

   let orderDishes = await OrderDish.find({ order: order.id, dish: dishes[0].id });
   expect(orderDishes.length).to.equals(1);
   expect(orderDishes[0].amount).to.equals(6);

   order = await Order.create({id:"adddish-same-dish-increase-amount-2"}).fetch();
   await Order.addDish({id: order.id}, dishes[0], 1, [{ id: dishes[1].id, modifierId: dishes[1].id }], "", "mod");
   await Order.addDish({id: order.id}, dishes[0], 1, null, "", "test");
   await Order.addDish({id: order.id}, dishes[0], 2, null, "", "test");
   orderDishes = await OrderDish.find({ order: order.id, dish: dishes[0].id });
   expect(orderDishes.length).to.equals(2);
   for (let dish of orderDishes) {
     if (dish.modifiers.length == 1) {
       expect(dish.amount).to.equals(1);
     } else {
       expect(dish.amount).to.equals(3);
     }
   }
 });
      */ 
