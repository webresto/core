"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const ExternalTestPaymentSystem_1 = require("../external_payments/ExternalTestPaymentSystem");
describe('Cart', function () {
    let cart;
    let dishes;
    let fullCart;
    // describe('New Example', function (){
    //   it('new it', function(){
    //     return true;
    //   });
    // });
    it('get dishes', async function () {
        dishes = await Dish.find({});
    });
    it('create Сart', async function () {
        cart = await Cart.create({});
        chai_1.expect(cart).to.be.an('object');
    });
    it('addDish', async function () {
        await cart.addDish(dishes[0], 1, [], '', 'test');
        await cart.addDish(dishes[1], 5, [], 'test comment', 'test');
        let result = await Cart.findOne(cart.id).populate('dishes');
        chai_1.expect(result.dishes.length).to.equal(2);
        let cartDishes = await CartDish.find({ cart: cart.id }).sort('createdAt');
        chai_1.expect(cartDishes[0].amount).to.equal(1);
        chai_1.expect(cartDishes[0].comment).to.equal('');
        chai_1.expect(cartDishes[0].addedBy).to.equal('test');
        chai_1.expect(cartDishes[1].amount).to.equal(5);
        chai_1.expect(cartDishes[1].comment).to.equal('test comment');
        chai_1.expect(cartDishes[1].addedBy).to.equal('test');
    });
    it('removeDish', async function () {
        let dish = (await Cart.findOne(cart.id).populate('dishes')).dishes[1];
        dish = await CartDish.findOne(dish.id);
        await cart.removeDish(dish, 1, false);
        let changedDish = await CartDish.findOne(dish.id);
        chai_1.expect(changedDish.amount).to.equal(dish.amount - 1);
    });
    // it('removeDish stack', async function(){
    //   await cart.addDish(dishes[2], 10, [], '', 'test');
    //   let dishId = (await Cart.findOne(cart.id).populate('dishes')).dishes[2].id;
    //   let lastDish = await CartDish.findOne(dishId);
    //   await cart.removeDish(lastDish, 0, true);
    //   let changedDish = await CartDish.findOne(dishId);
    //   expect(changedDish.amount).to.equal(9);
    // });
    it('setCount', async function () {
        let dish = (await Cart.findOne({ id: cart.id }).populate('dishes')).dishes[0];
        dish = await CartDish.findOne(dish.id);
        await cart.setCount(dish, 10);
        let changedDish = await CartDish.findOne({ id: dish.id });
        chai_1.expect(changedDish.amount).to.equal(10);
    });
    it('setModifierCount?', async function () {
        //TODO do nothing
    });
    it('setComment', async function () {
        let dish = (await Cart.findOne({ id: cart.id }).populate('dishes')).dishes[0];
        dish = await CartDish.findOne({ id: dish.id });
        let testComment = 'this is a test comment';
        await cart.setComment(dish, testComment);
        let changedDish = await CartDish.findOne({ id: dish.id });
        chai_1.expect(changedDish.comment).to.equal(testComment);
    });
    it('returnFullCart', async function () {
        cart = await Cart.create({});
        let res = await Cart.returnFullCart(cart);
    });
    it('addDish 20', async function () {
        cart = await Cart.create({});
        for (let i = 0; i < 20; i++) {
            await cart.addDish(dishes[i], 3, [], '', '');
        }
    });
    it('addDish 21th', async function () {
        await cart.addDish(dishes[21], 3, [], '', '');
    });
    it('setSelfService', async function () {
        let cart = await Cart.create({});
        await cart.addDish(dishes[0], 5, [], '', '');
        await cart.addDish(dishes[1], 3, [], '', '');
        await cart.addDish(dishes[2], 8, [], '', '');
        await cart.setSelfService(true);
        let changedCart = await Cart.findOne(cart.id);
        chai_1.expect(changedCart.selfService).to.equal(true);
        await cart.setSelfService(false);
        changedCart = await Cart.findOne(cart.id);
        chai_1.expect(changedCart.selfService).to.equal(false);
    });
    it('check', async function () {
        let customer = {
            phone: '+79998881212',
            name: 'Freeman Morgan'
        };
        let address = {
            city: 'New York',
            street: 'Green Road',
            home: "77",
            comment: ''
        };
        let result = await cart.check(customer, false);
        chai_1.expect(result).to.equal(true);
        result = await cart.check(customer, true, address);
        chai_1.expect(result).to.equal(true);
        let testPaymentSystem = await ExternalTestPaymentSystem_1.default.getInstance();
        let paymentSystem = (await PaymentMethod.find())[0];
        result = await cart.check(customer, false, address, paymentSystem.id);
        chai_1.expect(result).to.equal(true);
        // @ts-ignore
        let customerWrong = {
            phone: 'wrongphone'
        };
        result = await cart.check(null, null, null, paymentSystem.id);
        chai_1.expect(result).to.equal(true);
        // error promise test
        let error = null;
        try {
            await cart.check(customerWrong, false);
        }
        catch (e) {
            error = e;
        }
        chai_1.expect(error).to.be.an('object');
        // expect(async function (){await cart.check(customerWrong, false)}).to.throw();
    });
    // it('countCart', async function(){
    //   let cart = await Cart.create({});
    //   let totalWeight = 0;
    //   await cart.addDish(dishes[0], 5, [], '', '');
    //   await cart.addDish(dishes[1], 3, [], '', '');
    //   await cart.addDish(dishes[2], 8, [], '', '');
    //   totalWeight = dishes[0].weight * 5 + dishes[1].weight * 3 + dishes[2].weight * 8;
    //   cart = await Cart.findOne(cart.id);
    //   await Cart.countCart(cart);
    //   let changedCart = await Cart.findOne(cart.id);
    //   expect(changedCart.totalWeight).to.equal(totalWeight);
    //   expect(changedCart.uniqueDishes).to.equal(3);
    //   expect(changedCart.dishesCount).to.equal(5 + 3 + 8);
    // });
});
