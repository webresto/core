"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const actions_1 = require("../lib/actions");
const getEmitter_1 = require("../lib/getEmitter");
const _ = require("lodash");
const moment = require("moment");
const uuid_1 = require("uuid");
// TODO: предлагаю переименовать и корзины в ордер.
let cartCollection = {
    //@ts-ignore
    autoPK: false,
    attributes: {
        id: {
            type: 'string',
            primaryKey: true,
            defaultsTo: function () { return uuid_1.v4(); }
        },
        cartId: 'string',
        shortId: {
            type: 'string',
            defaultsTo: function () { return this.id.substr(this.id.length - 8).toUpperCase(); },
        },
        dishes: {
            collection: 'CartDish',
            via: 'cart'
        },
        discount: 'json',
        paymentMethod: {
            model: 'PaymentMethod',
            via: 'id'
        },
        paymentMethodTitle: 'string',
        paid: {
            type: 'boolean',
            defaultsTo: false
        },
        isPaymentPromise: {
            type: 'boolean',
            defaultsTo: true
        },
        dishesCount: 'integer',
        uniqueDishes: 'integer',
        modifiers: 'json',
        customer: 'json',
        address: 'json',
        comment: 'string',
        personsCount: 'string',
        //@ts-ignore Я думаю там гдето типизация для даты на ватерлайн типизации
        date: 'string',
        problem: {
            type: 'boolean',
            defaultsTo: false
        },
        rmsDelivered: {
            type: 'boolean',
            defaultsTo: false
        },
        rmsId: 'string',
        rmsOrderNumber: 'string',
        rmsOrderData: 'json',
        rmsDeliveryDate: 'string',
        rmsErrorMessage: 'string',
        rmsErrorCode: 'string',
        rmsStatusCode: 'string',
        deliveryStatus: 'string',
        selfService: {
            type: 'boolean',
            defaultsTo: false
        },
        deliveryDescription: {
            type: 'string',
            defaultsTo: ""
        },
        message: 'string',
        deliveryItem: 'string',
        deliveryCost: {
            type: 'float',
            defaultsTo: 0
        },
        totalWeight: {
            type: 'float',
            defaultsTo: 0
        },
        total: {
            type: 'float',
            defaultsTo: 0
        },
        orderTotal: {
            type: 'float',
            defaultsTo: 0
        },
        cartTotal: {
            type: 'float',
            defaultsTo: 0
        },
        discountTotal: {
            type: 'float',
            defaultsTo: 0
        },
        orderDate: 'datetime'
    }
};
let cartInstance = {
    addDish: async function (dish, amount, modifiers, comment, from, replace, cartDishId) {
        const emitter = getEmitter_1.default();
        await emitter.emit.apply(emitter, ['core-cart-before-add-dish', ...arguments]);
        let dishObj;
        if (typeof dish === "string") {
            dishObj = await Dish.findOne(dish);
            if (!dishObj) {
                throw { body: `Dish with id ${dish} not found`, code: 2 };
            }
        }
        else {
            dishObj = dish;
        }
        if (dishObj.balance !== -1)
            if (amount > dishObj.balance) {
                await emitter.emit.apply(emitter, ['core-cart-add-dish-reject-amount', ...arguments]);
                throw { body: `There is no so mush dishes with id ${dishObj.id}`, code: 1 };
            }
        const cart = await Cart.findOne({ id: this.id }).populate('dishes');
        if (cart.dishes.length > 99)
            throw "99 max dishes amount";
        if (cart.state === "ORDER")
            throw "cart with cartId " + cart.id + "in state ORDER";
        if (modifiers && modifiers.length) {
            modifiers.forEach((m) => {
                if (!m.amount)
                    m.amount = 1;
            });
        }
        await emitter.emit.apply(emitter, ['core-cart-add-dish-before-create-cartdish', ...arguments]);
        let cartDish;
        // auto replace and increase amount if same dishes without modifiers
        if (!replace && (!modifiers || (modifiers && modifiers.length === 0))) {
            let sameCartDishArray = await CartDish.find({ cart: this.id, dish: dishObj.id });
            for (let sameCartDish of sameCartDishArray) {
                if (sameCartDish && sameCartDish.modifiers && sameCartDish.modifiers.length === 0) {
                    cartDishId = Number(sameCartDish.id);
                    amount = amount + sameCartDish.amount;
                    replace = true;
                    break;
                }
            }
        }
        if (replace) {
            cartDish = (await CartDish.update({ id: cartDishId }, {
                dish: dishObj.id,
                cart: this.id,
                amount: amount,
                modifiers: modifiers || [],
                comment: comment,
                addedBy: from
            }))[0];
        }
        else {
            cartDish = await CartDish.create({
                dish: dishObj.id,
                cart: this.id,
                amount: amount,
                modifiers: modifiers || [],
                comment: comment,
                addedBy: from
            });
        }
        await cart.next('CART');
        await Cart.countCart(cart);
        cart.save();
        await emitter.emit.apply(emitter, ['core-cart-after-add-dish', cartDish, ...arguments]);
    },
    removeDish: async function (dish, amount, stack) {
        // TODO: удалить стек
        const emitter = getEmitter_1.default();
        await emitter.emit.apply(emitter, ['core-cart-before-remove-dish', ...arguments]);
        const cart = await Cart.findOne({ id: this.id }).populate('dishes');
        if (cart.state === "ORDER")
            throw "cart with cartId " + cart.id + "in state ORDER";
        var cartDish;
        if (stack) {
            amount = 1;
            cartDish = await CartDish.findOne({ where: { cart: cart.id, dish: dish.id }, sort: 'createdAt ASC' }).populate('dish');
        }
        else {
            cartDish = await CartDish.findOne({ cart: cart.id, id: dish.id }).populate('dish');
        }
        if (!cartDish) {
            await emitter.emit.apply(emitter, ['core-cart-remove-dish-reject-no-cartdish', ...arguments]);
            throw { body: `CartDish with id ${dish.id} in cart with id ${this.id} not found`, code: 1 };
        }
        const get = cartDish;
        get.amount -= amount;
        if (get.amount > 0) {
            await CartDish.update({ id: get.id }, { amount: get.amount });
        }
        else {
            get.destroy();
        }
        await cart.next('CART');
        await Cart.countCart(cart);
        cart.save();
        await emitter.emit.apply(emitter, ['core-cart-after-remove-dish', ...arguments]);
    },
    setCount: async function (dish, amount) {
        const emitter = getEmitter_1.default();
        await emitter.emit.apply(emitter, ['core-cart-before-set-count', ...arguments]);
        if (dish.dish.balance !== -1)
            if (amount > dish.dish.balance) {
                await emitter.emit.apply(emitter, ['core-cart-set-count-reject-amount', ...arguments]);
                throw { body: `There is no so mush dishes with id ${dish.dish.id}`, code: 1 };
            }
        const cart = await Cart.findOne(this.id).populate('dishes');
        if (cart.state === "ORDER")
            throw "cart with cartId " + cart.id + "in state ORDER";
        const cartDishes = await CartDish.find({ cart: cart.id }).populate('dish');
        const get = cartDishes.find(item => item.id === dish.id);
        if (get) {
            get.amount = amount;
            if (get.amount > 0) {
                await CartDish.update({ id: get.id }, { amount: get.amount });
            }
            else {
                get.destroy();
                sails.log.info('destroy', get.id);
            }
            await cart.next('CART');
            await Cart.countCart(cart);
            cart.save();
            await emitter.emit.apply(emitter, ['core-cart-after-set-count', ...arguments]);
        }
        else {
            await emitter.emit.apply(emitter, ['core-cart-set-count-reject-no-cartdish', ...arguments]);
            throw { body: `CartDish dish id ${dish.id} not found`, code: 2 };
        }
    },
    setComment: async function (dish, comment) {
        const emitter = getEmitter_1.default();
        const self = this;
        await emitter.emit.apply(emitter, ['core-cart-before-set-comment', ...arguments]);
        const cart = await Cart.findOne(this.id).populate('dishes');
        if (cart.state === "ORDER")
            throw "cart with cartId " + cart.id + "in state ORDER";
        const cartDish = await CartDish.findOne({ cart: cart.id, id: dish.id }).populate('dish');
        if (cartDish) {
            await CartDish.update(cartDish.id, { comment: comment });
            await cart.next('CART');
            await Cart.countCart(self);
            cart.save();
            await emitter.emit.apply(emitter, ['core-cart-after-set-comment', ...arguments]);
        }
        else {
            await emitter.emit.apply(emitter, ['core-cart-set-comment-reject-no-cartdish', ...arguments]);
            throw { body: `CartDish with id ${dish.id} not found`, code: 1 };
        }
    },
    /**
     * Set cart selfService field. Use this method to change selfService.
     * @param selfService
     */
    setSelfService: async function (selfService) {
        const self = this;
        sails.log.verbose('Cart > setSelfService >', selfService);
        await actions_1.default.reset(this);
        self.selfService = selfService;
        await self.save();
    },
    check: async function (customer, isSelfService, address, paymentMethodId) {
        const self = await Cart.countCart(this);
        if (self.state === "ORDER")
            throw "cart with cartId " + self.id + "in state ORDER";
        //const self: Cart = this;
        if (self.paid) {
            sails.log.error("CART > Check > error", self.id, "cart is paid");
            return false;
        }
        /**
         *  // IDEA Возможно надо добавить параметр Время Жизни  для чека (Сделать глобально понятие ревизии системы int если оно меньше версии чека, то надо проходить чек заново)
         */
        getEmitter_1.default().emit('core-cart-before-check', self, customer, isSelfService, address);
        sails.log.debug('Cart > check > before check >', customer, isSelfService, address, paymentMethodId);
        if (customer) {
            await checkCustomerInfo(customer);
            self.customer = customer;
        }
        else {
            if (self.customer === null) {
                throw {
                    code: 2,
                    error: 'customer is required'
                };
            }
        }
        await checkDate(self);
        if (paymentMethodId) {
            await checkPaymentMethod(paymentMethodId);
            self.paymentMethod = paymentMethodId;
            self.paymentMethodTitle = (await PaymentMethod.findOne(paymentMethodId)).title;
            self.isPaymentPromise = await PaymentMethod.isPaymentPromise(paymentMethodId);
        }
        isSelfService = isSelfService === undefined ? false : isSelfService;
        if (isSelfService) {
            getEmitter_1.default().emit('core-cart-check-self-service', self, customer, isSelfService, address);
            sails.log.verbose('Cart > check > is self delivery');
            await self.setSelfService(true);
            await self.next('CHECKOUT');
            return true;
        }
        if (address) {
            checkAddress(address);
            self.address = address;
        }
        else {
            if (!isSelfService && self.address === null) {
                throw {
                    code: 2,
                    error: 'address is required'
                };
            }
        }
        getEmitter_1.default().emit('core-cart-check-delivery', self, customer, isSelfService, address);
        const results = await getEmitter_1.default().emit('core-cart-check', self, customer, isSelfService, address, paymentMethodId);
        await self.save();
        sails.log.info('Cart > check > after wait general emitter', self, results);
        const resultsCount = results.length;
        const successCount = results.filter(r => r.state === "success").length;
        getEmitter_1.default().emit('core-cart-after-check', self, customer, isSelfService, address);
        if (resultsCount === 0)
            return true;
        const checkConfig = await SystemInfo.use('check');
        if (checkConfig) {
            if (checkConfig.requireAll) {
                if (resultsCount === successCount) {
                    if (self.getState() !== 'CHECKOUT') {
                        await self.next('CHECKOUT');
                    }
                    return true;
                }
                else {
                    throw {
                        code: 10,
                        error: 'one or more results from core-cart-check was not sucessed'
                    };
                }
            }
            if (checkConfig.notRequired) {
                if (self.getState() !== 'CHECKOUT') {
                    await self.next('CHECKOUT');
                }
                return true;
            }
        }
        if (successCount > 0) {
            if (self.getState() !== 'CHECKOUT') {
                await self.next('CHECKOUT');
            }
        }
        return successCount > 0;
    },
    order: async function () {
        const self = this;
        if (self.state === "ORDER")
            throw "cart with cartId " + self.id + "in state ORDER";
        // await self.save();
        // PTODO: проверка эта нужна
        // if(( self.isPaymentPromise && self.paid) || ( !self.isPaymentPromise && !self.paid) )
        //   return 3
        getEmitter_1.default().emit('core-cart-before-order', self);
        sails.log.verbose('Cart > order > before order >', self.customer, self.selfService, self.address);
        if (this.selfService) {
            getEmitter_1.default().emit('core-cart-order-self-service', self);
        }
        else {
            getEmitter_1.default().emit('core-cart-order-delivery', self);
        }
        await Cart.countCart(self);
        const results = await getEmitter_1.default().emit('core-cart-order', self);
        sails.log.verbose('Cart > order > after wait general emitter results: ', results);
        const resultsCount = results.length;
        const successCount = results.filter(r => r.state === "success").length;
        self.orderDate = moment().format("YYYY-MM-DD HH:mm:ss"); // TODO timezone
        const orderConfig = await SystemInfo.use('order');
        if (orderConfig) {
            if (orderConfig.requireAll) {
                if (resultsCount === successCount) {
                    order();
                    return 0;
                }
                else if (successCount === 0) {
                    return 1;
                }
                else {
                    return 2;
                }
            }
            if (orderConfig.notRequired) {
                order();
                return 0;
            }
        }
        if (true || false) { // философия доставочной пушки
            order();
            return 0;
        }
        else {
            return 1;
        }
        async function order() {
            await self.next('ORDER');
            /** Если сохранние модели вызвать до next то будет бесконечный цикл */
            sails.log.info('Cart > order > before save cart', self);
            await self.save();
            getEmitter_1.default().emit('core-cart-after-order', self);
        }
    },
    payment: async function () {
        const self = this;
        if (self.state === "ORDER")
            throw "cart with cartId " + self.id + "in state ORDER";
        var paymentResponse;
        let comment = "";
        var backLinkSuccess = (await SystemInfo.use('FrontendOrderPage')) + self.id;
        var backLinkFail = await SystemInfo.use('FrontendCheckoutPage');
        let paymentMethodId = await self.paymentMethodId();
        sails.log.verbose('Cart > payment > before payment register', self);
        var params = {
            backLinkSuccess: backLinkSuccess,
            backLinkFail: backLinkFail,
            comment: comment
        };
        await Cart.countCart(self);
        await getEmitter_1.default().emit('core-cart-payment', self, params);
        sails.log.info("Cart > payment > self before register:", self);
        try {
            paymentResponse = await PaymentDocument.register(self.id, 'cart', self.cartTotal, paymentMethodId, params.backLinkSuccess, params.backLinkFail, params.comment, self);
        }
        catch (e) {
            getEmitter_1.default().emit('error', 'cart>payment', e);
            sails.log.error('Cart > payment: ', e);
        }
        await self.next('PAYMENT');
        return paymentResponse;
    },
    paymentMethodId: async function (cart) {
        if (!cart)
            cart = this;
        //@ts-ignore
        let populatedCart = await Cart.findOne({ id: cart.id }).populate('paymentMethod');
        //@ts-ignore
        return populatedCart.paymentMethod.id;
    }
};
let cartModel = {
    /**
     * Считает количество, вес и прочие данные о корзине в зависимости от полоенных блюд
     * @param cart
     */
    countCart: async function (cart) {
        getEmitter_1.default().emit('core-cart-before-count', cart);
        if (typeof cart === 'string' || cart instanceof String) {
            cart = await Cart.findOne({ id: cart });
        }
        else {
            cart = await Cart.findOne({ id: cart.id });
        }
        const cartDishes = await CartDish.find({ cart: cart.id }).populate('dish');
        // const cartDishesClone = {};
        // cart.dishes.map(cd => cartDishesClone[cd.id] = _.cloneDeep(cd));
        let orderTotal = 0;
        let dishesCount = 0;
        let uniqueDishes = 0;
        let totalWeight = 0;
        for await (let cartDish of cartDishes) {
            try {
                if (cartDish.dish) {
                    const dish = await Dish.findOne(cartDish.dish.id);
                    // Проверяет что блюдо доступно к продаже
                    if (!dish) {
                        sails.log.error('Dish with id ' + cartDish.dish.id + ' not found!');
                        getEmitter_1.default().emit('core-cart-return-full-cart-destroy-cartdish', dish, cart);
                        await CartDish.destroy({ id: cartDish.dish.id });
                        continue;
                    }
                    if (dish.balance === -1 ? false : dish.balance < cartDish.amount) {
                        cartDish.amount = dish.balance;
                        getEmitter_1.default().emit('core-cartdish-change-amount', cartDish);
                        sails.log.debug(`Cart with id ${cart.id} and  CardDish with id ${cartDish.id} amount was changed!`);
                    }
                    cartDish.uniqueItems = 1;
                    cartDish.itemTotal = 0;
                    cartDish.weight = cartDish.dish.weight;
                    cartDish.totalWeight = 0;
                    if (cartDish.modifiers) {
                        for (let modifier of cartDish.modifiers) {
                            const modifierObj = await Dish.findOne(modifier.id);
                            if (!modifierObj) {
                                sails.log.error('Dish with id ' + modifier.id + ' not found!');
                                continue;
                            }
                            cartDish.uniqueItems++;
                            cartDish.itemTotal += modifier.amount * modifierObj.price;
                            cartDish.weight += modifierObj.weight;
                        }
                    }
                    cartDish.totalWeight = cartDish.weight * cartDish.amount;
                    cartDish.itemTotal += cartDish.dish.price;
                    cartDish.itemTotal *= cartDish.amount;
                    await CartDish.update({ id: cartDish.id }, cartDish);
                }
                orderTotal += cartDish.itemTotal;
                dishesCount += cartDish.amount;
                uniqueDishes++;
                totalWeight += cartDish.totalWeight;
            }
            catch (e) {
                sails.log.error('Cart > count > iterate cartDish error', e);
            }
        }
        // for (let cd in cart.dishes) {
        //   if (cart.dishes.hasOwnProperty(cd)) {
        //     const cartDish = cartDishes.find(cd1 => cd1.id === cart.dishes[cd].id);
        //     if (!cartDish)
        //       continue;
        //     cartDish.dish = cartDishesClone[cartDish.id].dish;
        //     //cart.dishes[cd] = cartDish;
        //   }
        // }
        // TODO: здесь точка входа для расчета дискаунтов, т.к. они не должны конкурировать, нужно написать адаптером.
        await getEmitter_1.default().emit('core-cart-count-discount-apply', cart);
        cart.dishesCount = dishesCount;
        cart.uniqueDishes = uniqueDishes;
        cart.totalWeight = totalWeight;
        cart.total = orderTotal - cart.discountTotal;
        cart.orderTotal = orderTotal - cart.discountTotal;
        cart.cartTotal = orderTotal + cart.deliveryCost - cart.discountTotal;
        if (cart.delivery) {
            cart.total += cart.delivery;
        }
        // cart.dishes = await CartDish.find({cart: cart.id});
        delete (cart.dishes);
        // // TODO возможно тут этого делать не надо. а нужно перенсти в функции вызывающие эту функцию
        const result = (await Cart.update({ id: cart.id }, cart))[0];
        cart.dishes = await CartDish.find({ cart: cart.id });
        getEmitter_1.default().emit('core-cart-after-count', cart);
        return result;
    },
    doPaid: async function (paymentDocument) {
        let cart = await Cart.findOne(paymentDocument.paymentId);
        Cart.countCart(cart);
        try {
            let paymentMethodTitle = (await PaymentMethod.findOne(paymentDocument.paymentMethod)).title;
            await Cart.update({ id: paymentDocument.paymentId }, { paid: true, paymentMethod: paymentDocument.paymentMethod, paymentMethodTitle: paymentMethodTitle });
            console.log(">>>>>>", cart);
            console.log(">>>>>>", cart.state, cart.cartTotal, paymentDocument.amount);
            if (cart.state !== "PAYMENT") {
                sails.log.error('Cart > doPaid: is strange cart state is not PAYMENT', cart);
            }
            if (cart.cartTotal !== paymentDocument.amount) {
                cart.problem = true;
                cart.comment = cart.comment + " !!! ВНИМАНИЕ, состав заказа был изменен, на счет в банке поступило :" + paymentDocument.amount + " рублей 🤪 !!!";
            }
            await cart.order();
        }
        catch (e) {
            sails.log.error('Cart > doPaid error: ', e);
            throw e;
        }
    },
};
async function checkCustomerInfo(customer) {
    if (!customer.name) {
        throw {
            code: 1,
            error: 'customer.name is required'
        };
    }
    if (!customer.phone) {
        throw {
            code: 2,
            error: 'customer.phone is required'
        };
    }
    const nameRegex = await SystemInfo.use('nameRegex');
    const phoneRegex = await SystemInfo.use('phoneRegex');
    if (nameRegex) {
        if (!nameRegex.match(customer.name)) {
            throw {
                code: 3,
                error: 'customer.name is invalid'
            };
        }
    }
    if (phoneRegex) {
        if (!phoneRegex.match(customer.phone)) {
            throw {
                code: 4,
                error: 'customer.phone is invalid'
            };
        }
    }
}
function checkAddress(address) {
    if (!address.street) {
        throw {
            code: 5,
            error: 'address.street  is required'
        };
    }
    if (!address.home) {
        throw {
            code: 6,
            error: 'address.home is required'
        };
    }
    if (!address.city) {
        throw {
            code: 7,
            error: 'address.city is required'
        };
    }
}
async function checkPaymentMethod(paymentMethodId) {
    if (!await PaymentMethod.checkAvailable(paymentMethodId)) {
        throw {
            code: 8,
            error: 'paymentMethod not available'
        };
    }
}
async function checkDate(cart) {
    if (cart.date) {
        const date = moment(cart.date, "YYYY-MM-DD HH:mm:ss");
        if (!date.isValid()) {
            throw {
                code: 9,
                error: 'date is not valid, required (YYYY-MM-DD HH:mm:ss)'
            };
        }
        const possibleDatetime = await getOrderDateLimit();
        const momentDateLimit = moment(possibleDatetime);
        if (!date.isBefore(momentDateLimit)) {
            throw {
                code: 10,
                error: 'delivery far, far away! allowed not after' + possibleDatetime
            };
        }
    }
}
/**
 * Возвратит максимальное дату и время доставки
 * (по умолчанию 14 дней)
 */
async function getOrderDateLimit() {
    let periodPossibleForOrder = await SystemInfo.use('PeriodPossibleForOrder');
    if (periodPossibleForOrder === 0 || periodPossibleForOrder === undefined || periodPossibleForOrder === null) {
        periodPossibleForOrder = "20160";
    }
    return moment().add(periodPossibleForOrder, 'minutes').format("YYYY-MM-DD HH:mm:ss");
}
// JavaScript merge cart model
cartCollection.attributes = _.merge(cartCollection.attributes, cartInstance);
const finalModel = _.merge(cartCollection, cartModel);
module.exports = finalModel;
