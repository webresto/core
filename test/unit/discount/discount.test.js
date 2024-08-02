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
        // await Promotion.destroy({})
    });
    let discInMemory = new discount_1.InMemoryDiscountAdapter;
    let discountEx = {
        id: "1-id",
        badge: 'test',
        configDiscount: {
            discountType: "flat",
            discountAmount: 1.33,
            dishes: ["a"],
            groups: ["a"],
            excludeModifiers: true
        },
        name: "1-name",
        description: "string",
        concept: ["origin", "clear", "Happy Birthday", "3dif", "Display Dish"],
        condition: (arg) => {
            if ((0, findModelInstance_1.default)(arg) === "Order" && (0, stringsInArray_1.stringsInArray)(arg.concept, discountEx.concept)) {
                // Order.populate()
                //discountEx.concept.includes(arg.concept)
                return true;
            }
            if ((0, findModelInstance_1.default)(arg) === "Dish" && (0, stringsInArray_1.stringsInArray)(arg.concept, discountEx.concept)) {
                return (0, stringsInArray_1.stringsInArray)(arg.id, discountEx.configDiscount.dishes);
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
            // if (this.isJoint === true && this.isPublic === true) {
            //   // 
            dish.discountAmount = index_1.Adapter.getPromotionAdapter().promotions[this.id].configDiscount.discountAmount;
            dish.discountType = index_1.Adapter.getPromotionAdapter().promotions[this.id].configDiscount.discountType;
            dish.oldPrice = dish.salePrice;
            dish.salePrice = this.configDiscount.discountType === "flat"
                ? new decimal_js_1.default(dish.price).minus(+this.configDiscount.discountAmount).toNumber()
                : new decimal_js_1.default(dish.price)
                    .mul(+this.configDiscount.discountAmount / 100)
                    .toNumber();
            // }
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
        badge: 'test',
        isPublic: true,
        configDiscount: {
            discountType: "flat",
            discountAmount: 1,
            dishes: ["Aaa"],
            groups: [],
            excludeModifiers: true
        }
    });
    let discountsArray = [disc1, discInMemory, discountEx];
    let promotionAdapter;
    before(async () => {
        promotionAdapter = index_1.Adapter.getPromotionAdapter();
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
        await index_1.Adapter.getPromotionAdapter().addPromotionHandler(discountEx);
        let discount = await Promotion.find({});
        let discountById = await index_1.Adapter.getPromotionAdapter().getPromotionHandlerById(discountEx.id);
        (0, chai_1.expect)(discount[0]).to.be.an("object");
        (0, chai_1.expect)(discountById).to.be.an("object");
    });
    // it("discount applyPromotion flat on order", async function () {
    //   let promotionAdapter = Adapter.getPromotionAdapter()
    //   let order = await Order.create({id: "add-dish-with-discount"}).fetch();
    //   await Order.updateOne({id: order.id}, {concept: "origin",user: "user"});
    //   let dish1 = await Dish.createOrUpdate(dishGenerator({name: "test dish", price: 10, concept: "origin",parentGroup:groupsId[0]}));
    //   discountEx.configDiscount.dishes.push(dish1.id)
    //   await promotionAdapter.addPromotionHandler(discountEx)
    //   await Order.addDish({id: order.id}, dish1, 5, [], "", "user");
    //   await Adapter.getPromotionAdapter().clearOfPromotion(order)
    //   await configuredPromotion.applyPromotion(order.id)
    //   let result = await Order.findOne(order.id) 
    //   expect(result.discountTotal).to.equal(6.65);
    // });
    it("discount applyPromotion flat on order with different dishes", async function () {
        let order = await Order.create({ id: "add-dish-with-discounts" }).fetch();
        await Order.updateOne({ id: order.id }, { user: "user" });
        let dish1 = await Dish.createOrUpdate((0, dish_generator_1.default)({ name: "test dish", price: 10.1, concept: "origin", parentGroup: groupsId[0] }));
        let dish2 = await Dish.createOrUpdate((0, dish_generator_1.default)({ name: "test fish", price: 15.2, concept: "origin", parentGroup: groupsId[0] }));
        discountEx.configDiscount.dishes.push(dish1.id);
        discountEx.configDiscount.dishes.push(dish2.id);
        await promotionAdapter.addPromotionHandler(discountEx);
        await Order.addDish({ id: order.id }, dish1, 5, [], "", "user");
        await Order.addDish({ id: order.id }, dish2, 4, [], "", "user");
        // let result1 = await Dish.findOne(dish1.id)
        await index_1.Adapter.getPromotionAdapter().clearOfPromotion(order);
        await configuredPromotion.applyPromotion(order);
        (0, chai_1.expect)(order.promotionFlatDiscount).to.equal(11.97);
    });
    it("discount decimal check on order with different dishes", async function () {
        let order = await Order.create({ id: "apply-to-ordersa" }).fetch();
        await Order.updateOne({ id: order.id }, { user: "user" });
        //Decimal check 15.2,  10.1
        let dish1 = await Dish.createOrUpdate((0, dish_generator_1.default)({ name: "test disha", price: 10.1, concept: "clear", parentGroup: groupsId[0] }));
        let dish2 = await Dish.createOrUpdate((0, dish_generator_1.default)({ name: "test fisha", price: 15.2, concept: "clear", parentGroup: groupsId[0] }));
        discountEx.configDiscount.dishes.push(dish1.id);
        discountEx.configDiscount.dishes.push(dish2.id);
        await promotionAdapter.addPromotionHandler(discountEx);
        await Order.addDish({ id: order.id }, dish1, 5, [], "", "user");
        await Order.addDish({ id: order.id }, dish2, 4, [], "", "user");
        order = await Order.findOne(order.id);
        await promotionAdapter.processOrder(order);
        (0, chai_1.expect)(order.promotionFlatDiscount).to.equal(11.97);
        let dish3 = await Dish.createOrUpdate((0, dish_generator_1.default)({ name: "test disha", price: 10, concept: "a", parentGroup: groupsId[0] }));
        let dish4 = await Dish.createOrUpdate((0, dish_generator_1.default)({ name: "test fisha", price: 15, concept: "a", parentGroup: groupsId[0] }));
        await Order.addDish({ id: order.id }, dish3, 5, [], "", "user");
        await Order.addDish({ id: order.id }, dish4, 4, [], "", "user");
        await promotionAdapter.processOrder(order);
        (0, chai_1.expect)(order.promotionFlatDiscount).to.equal(11.97);
    });
    it("discount applyPromotion percentage on order with different dishes", async function () {
        let order = await Order.create({ id: "add-dish-with-discountsa" }).fetch();
        await Order.updateOne({ id: order.id }, { user: "user" });
        let dish1 = await Dish.createOrUpdate((0, dish_generator_1.default)({ name: "test dish", price: 10.1, concept: "origin", parentGroup: groupsId[0] }));
        let dish2 = await Dish.createOrUpdate((0, dish_generator_1.default)({ name: "test fish", price: 15.2, concept: "origin", parentGroup: groupsId[0] }));
        discInMemory.configDiscount.dishes.push(dish1.id);
        discInMemory.configDiscount.dishes.push(dish2.id);
        await promotionAdapter.addPromotionHandler(discInMemory);
        await Order.addDish({ id: order.id }, dish1, 5, [], "", "user");
        await Order.addDish({ id: order.id }, dish2, 4, [], "", "user");
        // DiscountAdapter.applyToOrder(order)
        await index_1.Adapter.getPromotionAdapter().clearOfPromotion(order);
        await configuredPromotionFromMemory.applyPromotion(order);
        //        let result = await Order.findOne(order.id) //.populate("dishes");
        (0, chai_1.expect)(order.promotionFlatDiscount).to.equal(11.13);
    });
    it("discount test dishes with flat and percentage types of discounts but same concept", async function () {
        let order = await Order.create({ id: "test-discounts-on-different-types" }).fetch();
        await Order.updateOne({ id: order.id }, { user: "user" });
        let dish1 = await Dish.createOrUpdate((0, dish_generator_1.default)({ name: "test dish", price: 10.1, concept: "Happy Birthday", parentGroup: groupsId[0] }));
        let dish2 = await Dish.createOrUpdate((0, dish_generator_1.default)({ name: "test fish", price: 15.2, concept: "Happy Birthday", parentGroup: groupsId[0] }));
        let dish3 = await Dish.createOrUpdate((0, dish_generator_1.default)({ name: "test disha", price: 10.1, concept: "Happy Birthday", parentGroup: groupsId[0] }));
        let dish4 = await Dish.createOrUpdate((0, dish_generator_1.default)({ name: "test fisha", price: 15.2, concept: "Happy Birthday", parentGroup: groupsId[0] }));
        let dish5 = await Dish.createOrUpdate((0, dish_generator_1.default)({ name: "test fishw", price: 15.2, concept: "Happy Birthday", parentGroup: groupsId[0] }));
        let dishes = await Dish.find({});
        const dishesId = dishes.map(dish => dish.id);
        discInMemory.configDiscount.dishes = dishesId;
        discountEx.configDiscount.dishes = dishesId;
        await promotionAdapter.addPromotionHandler(discInMemory);
        await promotionAdapter.addPromotionHandler(discountEx);
        await Order.addDish({ id: order.id }, dish1, 5, [], "", "user");
        await Order.addDish({ id: order.id }, dish2, 4, [], "", "user");
        await Order.addDish({ id: order.id }, dish3, 5, [], "", "user");
        await Order.addDish({ id: order.id }, dish4, 4, [], "", "user");
        await Order.addDish({ id: order.id }, dish5, 5, [], "", "user");
        // 29.86 + 30.59 = 60.45
        order = await Order.findOne(order.id);
        await promotionAdapter.processOrder(order);
        //   let result = await Order.findOne(order.id)
        (0, chai_1.expect)(order.promotionFlatDiscount).to.equal(60.45);
    });
    it("discount test dishes with flat and percentage types of discounts but different concept", async function () {
        let order = await Order.create({ id: "test-different-types-and-concept" }).fetch();
        await Order.updateOne({ id: order.id }, { user: "user" });
        let dish1 = await Dish.createOrUpdate((0, dish_generator_1.default)({ name: "test dish", price: 10.1, concept: "Happy Birthday", parentGroup: groupsId[0] }));
        let dish2 = await Dish.createOrUpdate((0, dish_generator_1.default)({ name: "test fish", price: 15.2, concept: "NewYear", parentGroup: groupsId[0] }));
        let dish3 = await Dish.createOrUpdate((0, dish_generator_1.default)({ name: "test disha", price: 10.1, concept: "Happy Birthday", parentGroup: groupsId[0] }));
        let dish4 = await Dish.createOrUpdate((0, dish_generator_1.default)({ name: "test fisha", price: 15.2, concept: "NewYear", parentGroup: groupsId[0] }));
        let dish5 = await Dish.createOrUpdate((0, dish_generator_1.default)({ name: "test fishw", price: 15.2, concept: "Happy Birthday", parentGroup: groupsId[0] }));
        let dishes = await Dish.find({});
        const dishesId = dishes.map(dish => dish.id);
        discInMemory.configDiscount.dishes = dishesId;
        discountEx.configDiscount.dishes = dishesId;
        await promotionAdapter.addPromotionHandler(discInMemory);
        await promotionAdapter.addPromotionHandler(discountEx);
        await Order.addDish({ id: order.id }, dish1, 5, [], "", "user");
        await Order.addDish({ id: order.id }, dish2, 4, [], "", "user");
        await Order.addDish({ id: order.id }, dish3, 5, [], "", "user");
        await Order.addDish({ id: order.id }, dish4, 4, [], "", "user");
        await Order.addDish({ id: order.id }, dish5, 5, [], "", "user");
        //  17.7 + 12.16 + 19.95 = 49.81
        // await promotionAdapter.addPromotionHandler(discInMemory)
        // await promotionAdapter.addPromotionHandler(discountEx)
        await promotionAdapter.processOrder(order);
        order = await Order.findOne(order.id).populate('dishes');
        let basketDiscount = 0;
        for (const dish of order.dishes) {
            if (typeof dish !== 'number') {
                if (dish.addedBy !== "user")
                    continue;
                let discount = discountsArray.find((d) => d.id === dish.discountId);
                console.log(dish, discount);
                (0, chai_1.expect)(dish.discountAmount).to.equal(discount.configDiscount.discountAmount);
                (0, chai_1.expect)(dish.discountAmount).to.equal(discount.configDiscount.discountAmount);
                if (discount.configDiscount.discountType === "flat") {
                    basketDiscount += discount.configDiscount.discountAmount * dish.amount;
                }
                else {
                    basketDiscount += (discount.configDiscount.discountAmount * 0.01 * dish.itemPrice * dish.amount);
                }
            }
        }
        console.log(">>>>>>>>>> basketDiscount", basketDiscount);
        (0, chai_1.expect)(basketDiscount).to.equal(order.promotionFlatDiscount);
        (0, chai_1.expect)(order.promotionFlatDiscount).to.equal(49.81);
    });
    it("discount test dishes with 3 dif type of discount", async function () {
        let order = await Order.create({ id: "test-3-types-of-discount" }).fetch();
        await Order.updateOne({ id: order.id }, { user: "user" });
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
        await promotionAdapter.addPromotionHandler(disc1);
        await promotionAdapter.addPromotionHandler(discInMemory);
        await promotionAdapter.addPromotionHandler(discountEx);
        await Order.addDish({ id: order.id }, dish1, 5, [], "", "user");
        await Order.addDish({ id: order.id }, dish2, 4, [], "", "user");
        await Order.addDish({ id: order.id }, dish3, 5, [], "", "user");
        await Order.addDish({ id: order.id }, dish4, 4, [], "", "user");
        await Order.addDish({ id: order.id }, dish5, 5, [], "", "user");
        let result = await Order.findOne(order.id); //.populate("dishes");
        // 18.62  + 136.8 - 10% = 18.62 + 13,68 = 32.3+ (101 +60.8) - 10% = 32.3 + 16.18 = 48.48 + 14 = 62.48
        let orderTotal = dish1.price * 5 + dish2.price * 4 + dish3.price * 5 + dish4.price * 4 + dish5.price * 5;
        (0, chai_1.expect)(result.basketTotal).to.equal(orderTotal);
        let _dishes = await OrderDish.find({ order: result.id });
        // console.log("___________________ORDER DISHES", JSON.stringify(_dishes, null, 4))
        (0, chai_1.expect)(result.discountTotal).to.equal(62.48);
    });
    it("discount test displayDish", async function () {
        let dish1 = await Dish.createOrUpdate((0, dish_generator_1.default)({ name: "test dish2", price: 10.1, concept: "Display Dish", parentGroup: groupsId[0] }));
        let dish2 = await Dish.createOrUpdate((0, dish_generator_1.default)({ name: "test fish3", price: 15.2, concept: "Display Dish", parentGroup: groupsId[0] }));
        discInMemory.configDiscount.dishes.push(dish1.id);
        discInMemory.configDiscount.dishes.push(dish2.id);
        discountEx.configDiscount.dishes.push(dish1.id);
        discountEx.configDiscount.dishes.push(dish2.id);
        disc1.configDiscount.dishes.push(dish1.id);
        await promotionAdapter.addPromotionHandler(discInMemory);
        await promotionAdapter.addPromotionHandler(discountEx);
        let display = await Dish.display({ id: dish1.id });
        (0, chai_1.expect)(display[0].id).to.equal(dish1.id);
        (0, chai_1.expect)(display[0].discountAmount).to.equal(1.33);
        (0, chai_1.expect)(display[0].discountType).to.equal("flat");
    });
    it("discount test displayGroup", async function () {
        let order = await Order.create({ id: "test-display-group" }).fetch();
        await Order.updateOne({ id: order.id }, { user: "user" });
        await promotionAdapter.addPromotionHandler(discountEx);
        let group1 = (0, group_generator_1.default)();
        await Group.create(group1);
        let display = await Group.display({ id: group1.id });
        (0, chai_1.expect)(display[0].id).to.equal(group1.id);
        (0, chai_1.expect)(display[0].discountAmount).to.equal(1.33);
        (0, chai_1.expect)(display[0].discountType).to.equal("flat");
    });
    it("discount test clearDiscount", async function () {
        let order = await Order.create({ id: "test-clear-discount" }).fetch();
        await Order.updateOne({ id: order.id }, { user: "user" });
        let dish1 = await Dish.createOrUpdate((0, dish_generator_1.default)({ name: "test dish", price: 10, concept: "origin", parentGroup: groupsId[0] }));
        discountEx.configDiscount.dishes.push(dish1.id);
        await promotionAdapter.addPromotionHandler(discountEx);
        await Order.addDish({ id: order.id }, dish1, 5, [], "", "user");
        // await promotionAdapter.processOrder(order)
        await index_1.Adapter.getPromotionAdapter().clearOfPromotion(order);
        let result = await Order.findOne(order.id);
        (0, chai_1.expect)(result.discountTotal).to.equal(0);
    });
    it("discount test clearDiscount orderDish", async function () {
        let order = await Order.create({ id: "test-clear-discount-OrderDish" }).fetch();
        await Order.updateOne({ id: order.id }, { user: "user" });
        let dish1 = await Dish.createOrUpdate((0, dish_generator_1.default)({ name: "test dish", price: 10, concept: "clear", parentGroup: groupsId[0] }));
        discountEx.configDiscount.dishes.push(dish1.id);
        await promotionAdapter.addPromotionHandler(discountEx);
        await Order.addDish({ id: order.id }, dish1, 5, [], "", "user");
        // before clear
        let orderDishes1 = await OrderDish.find({ order: order.id }).populate("dish");
        (0, chai_1.expect)(orderDishes1[0].discountTotal).to.equal(6.65);
        //after clear
        await index_1.Adapter.getPromotionAdapter().clearOfPromotion(order);
        let orderDishes = await OrderDish.find({ order: order.id }).populate("dish");
        (0, chai_1.expect)(orderDishes[0].discountTotal).to.equal(0);
    });
    it("discount test Adapter.getDiscount ", async function () {
        let order = await Order.create({ id: "test-clear-discount-order-dish-adapter" }).fetch();
        await Order.updateOne({ id: order.id }, { user: "user" });
        // let Adapter.getPromotionAdapter() = DiscountAdapter.initialize()
        let a = index_1.Adapter.getPromotionAdapter();
        let dish1 = await Dish.createOrUpdate((0, dish_generator_1.default)({ name: "test dish", price: 10, concept: "clear", parentGroup: groupsId[0] }));
        discountEx.configDiscount.dishes.push(dish1.id);
        await a.addPromotionHandler(discountEx);
        await Order.addDish({ id: order.id }, dish1, 5, [], "", "user");
        // before clear
        let orderDishes1 = await OrderDish.find({ order: order.id }).populate("dish");
        (0, chai_1.expect)(orderDishes1[0].discountTotal).to.equal(6.65);
        //after clear
        await index_1.Adapter.getPromotionAdapter().clearOfPromotion(order);
        let orderDishes = await OrderDish.find({ order: order.id }).populate("dish");
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
    */ ;
});
