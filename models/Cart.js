"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const checkExpression_1 = require("../lib/checkExpression");
const actions_1 = require("../lib/actions");
const getEmitter_1 = require("../lib/getEmitter");
const _ = require("lodash");
module.exports = {
    attributes: {
        id: {
            type: 'string',
            primaryKey: true
        },
        cartId: 'string',
        dishes: {
            collection: 'CartDish',
            via: 'cart'
        },
        paymentMethod: {
            collection: 'PaymentMethod',
            via: 'id'
        },
        paid: {
            type: 'boolean',
            defaultsTo: false
        },
        dishesCount: 'integer',
        uniqueDishes: 'integer',
        cartTotal: 'float',
        modifiers: 'json',
        delivery: 'float',
        customer: 'json',
        address: 'json',
        comment: 'string',
        personsCount: 'integer',
        problem: {
            type: 'boolean',
            defaultsTo: false
        },
        sendToIiko: {
            type: 'boolean',
            defaultsTo: false
        },
        rmsId: 'string',
        deliveryStatus: 'string',
        selfDelivery: {
            type: 'boolean',
            defaultsTo: false
        },
        deliveryDescription: {
            type: 'string',
            defaultsTo: ""
        },
        message: 'string',
        deliveryItem: 'string',
        totalWeight: 'float',
        total: 'float',
        addDish: async function (dish, amount, modifiers, comment, from) {
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
            if (modifiers && modifiers.length) {
                modifiers.forEach((m) => {
                    if (!m.amount)
                        m.amount = 1;
                });
            }
            await emitter.emit.apply(emitter, ['core-cart-add-dish-before-create-cartdish', ...arguments]);
            const cartDish = await CartDish.create({
                dish: dishObj.id,
                cart: this.id,
                amount: amount,
                modifiers: modifiers || [],
                comment: comment,
                addedBy: from
            });
            await cart.next('CART');
            await emitter.emit.apply(emitter, ['core-cart-after-add-dish', cartDish, ...arguments]);
        },
        removeDish: async function (dish, amount, stack) {
            const emitter = getEmitter_1.default();
            await emitter.emit.apply(emitter, ['core-cart-before-remove-dish', ...arguments]);
            const cart = await Cart.findOne({ id: this.id }).populate('dishes');
            var cartDish;
            if (stack) {
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
                await emitter.emit.apply(emitter, ['core-cart-after-set-count', ...arguments]);
            }
            else {
                await emitter.emit.apply(emitter, ['core-cart-set-count-reject-no-cartdish', ...arguments]);
                throw { body: `CartDish dish id ${dish.id} not found`, code: 2 };
            }
        },
        setModifierCount: async function (dish, modifier, amount) {
            const emitter = getEmitter_1.default();
            await emitter.emit.apply(emitter, ['core-cart-before-set-modifier-count', ...arguments]);
            if (modifier.balance !== -1)
                if (amount > modifier.balance) {
                    await emitter.emit.apply(emitter, ['core-cart-set-modifier-count-reject-amount', ...arguments]);
                    throw { body: `There is no so mush dishes with id ${modifier.id}`, code: 1 };
                }
            const cartDishes = await CartDish.find({ cart: this.id }).populate('dish').populate('modifiers');
            const get = cartDishes.filter(item => item.dish.id === dish.id)[0];
            if (!get) {
                await emitter.emit.apply(emitter, ['core-cart-set-modifier-count-reject-no-cartdish', ...arguments]);
                throw { body: `CartDish dish id ${dish.id} not found`, code: 2 };
            }
            const dish1 = await Dish.findOne({ id: dish.id });
            const getModif = dish1.modifiers.find(item => item.id === modifier.id);
            if (!getModif) {
                await emitter.emit.apply(emitter, ['core-cart-set-modifier-count-reject-no-modifier-dish', ...arguments]);
                throw { body: `Dish dish id ${getModif.id} not found`, code: 3 };
            }
            let getMofifFromDish = get.modifiers.filter(item => modifier.id === item.dish.id)[0];
            if (!getMofifFromDish) {
                await emitter.emit.apply(emitter, ['core-cart-set-modifier-count-reject-no-modifier-in-dish', ...arguments]);
                throw { body: `Modifier ${modifier.id} in dish id ${dish.id} not found`, code: 4 };
            }
            getMofifFromDish.amount = amount;
            await CartDish.update({ id: getMofifFromDish.id }, { amount: getMofifFromDish.amount });
            await this.next('CART');
            await emitter.emit.apply(emitter, ['core-cart-after-set-modifier-count', ...arguments]);
        },
        setComment: async function (dish, comment) {
            const emitter = getEmitter_1.default();
            await emitter.emit.apply(emitter, ['core-cart-before-set-comment', ...arguments]);
            const cart = await Cart.findOne(this.id).populate('dishes');
            const cartDish = await CartDish.findOne({ cart: cart.id, id: dish.id }).populate('dish');
            if (cartDish) {
                await CartDish.update(cartDish.id, { comment: comment });
                await cart.next('CART');
                await this.countCart(cart);
                await emitter.emit.apply(emitter, ['core-cart-after-set-comment', ...arguments]);
            }
            else {
                await emitter.emit.apply(emitter, ['core-cart-set-comment-reject-no-cartdish', ...arguments]);
                throw { body: `CartDish with id ${dish.id} not found`, code: 1 };
            }
        },
        setSelfDelivery: async function (selfService) {
            const self = this;
            sails.log.verbose('Cart > setSelfDelivery >', selfService);
            await actions_1.default.reset(this.id);
            self.selfDelivery = selfService;
            await self.save();
        },
        check: async function (customer, isSelfService, address, paymentMethodId) {
            const self = this;
            if (self.paid)
                return false;
            getEmitter_1.default().emit('core-cart-before-check', self, customer, isSelfService, address);
            sails.log.verbose('Cart > check > before check >', customer, isSelfService, address);
            await checkCustomerInfo(customer);
            if (paymentMethodId) {
                await checkPaymentMethod(paymentMethodId);
            }
            self.customer = customer;
            await self.save();
            if (isSelfService) {
                getEmitter_1.default().emit('core-cart-check-self-service', self, customer, isSelfService, address);
                sails.log.verbose('Cart > check > is self delivery');
                await self.setSelfDelivery(true);
                await self.next();
                return true;
            }
            getEmitter_1.default().emit('core-cart-check-delivery', self, customer, isSelfService, address);
            checkAddress(address);
            self.address = address;
            await self.save();
            const results = await getEmitter_1.default().emit('core-cart-check', self, customer, isSelfService, address);
            sails.log.verbose('Cart > check > after wait general emitter', results);
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
                            await self.next();
                        }
                    }
                    return resultsCount === successCount;
                }
                if (checkConfig.notRequired) {
                    if (self.getState() === 'CHECKOUT') {
                        await self.next();
                    }
                    return true;
                }
            }
            if (successCount > 0) {
                if (self.getState() === 'CHECKOUT') {
                    await self.next();
                }
            }
            return successCount > 0;
        },
        order: async function () {
            const self = this;
            if (self.paid)
                return 3;
            getEmitter_1.default().emit('core-cart-before-order', self);
            sails.log.verbose('Cart > order > before order >', self.customer, self.selfDelivery, self.address);
            if (this.selfDelivery) {
                getEmitter_1.default().emit('core-cart-order-self-service', self);
            }
            else {
                getEmitter_1.default().emit('core-cart-order-delivery', self);
            }
            const results = await getEmitter_1.default().emit('core-cart-order', self);
            sails.log.verbose('Cart > order > after wait general emitter', results);
            const resultsCount = results.length;
            const successCount = results.filter(r => r.state === "success").length;
            getEmitter_1.default().emit('core-cart-after-order', self);
            const orderConfig = await SystemInfo.use('order');
            if (orderConfig) {
                if (orderConfig.requireAll) {
                    if (resultsCount === successCount) {
                        await self.next();
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
                    await self.next();
                    return 0;
                }
            }
            if (true || false) {
                await self.next();
                return 0;
            }
            else {
                return 1;
            }
        }
    },
    payment: async function () {
        const self = this;
        return {
            redirectLink: "___",
            total: 123,
            id: "____",
            originModel: "____",
            paymentAdapter: "____"
        };
    },
    beforeCreate: function (values, next) {
        getEmitter_1.default().emit('core-cart-before-create', values).then(() => {
            this.countCart(values).then(next, next);
        });
    },
    afterUpdate: async function (values, next) {
        getEmitter_1.default().emit('core-cart-after-update', values).then(() => {
            const self = this;
            sails.log.verbose('Cart > afterUpdate > ', values);
            if (self.paid && self.getState() === 'PAYMENT')
                self.order();
            next();
        });
    },
    returnFullCart: async function (cart) {
        getEmitter_1.default().emit('core-cart-before-return-full-cart', cart);
        const cart2 = await Cart.findOne({ id: cart.id }).populate('dishes');
        const cartDishes = await CartDish.find({ cart: cart.id }).populate('dish').sort('createdAt');
        for (let cartDish of cartDishes) {
            if (!cartDish.dish) {
                sails.log.error('cartDish', cartDish.id, 'has not dish');
                continue;
            }
            if (!cart2.dishes.filter(d => d.id === cartDish.id).length) {
                sails.log.error('cartDish', cartDish.id, 'not exists in cart', cart.id);
                continue;
            }
            const dish = await Dish.findOne({
                id: cartDish.dish.id,
                isDeleted: false
            }).populate('images').populate('parentGroup');
            const reason = checkExpression_1.default(dish);
            const reasonG = checkExpression_1.default(dish.parentGroup);
            const reasonBool = reason === 'promo' || reason === 'visible' || !reason || reasonG === 'promo' ||
                reasonG === 'visible' || !reasonG;
            if (dish && dish.parentGroup && reasonBool && (dish.balance === -1 ? true : dish.balance >= cartDish.amount)) {
                await Dish.getDishModifiers(dish);
                cartDish.dish = dish;
            }
            else {
                sails.log.info('destroy', dish.id);
                getEmitter_1.default().emit('core-cart-return-full-cart-destroy-cartdish', dish, cart);
                await CartDish.destroy(dish);
                cart2.dishes.remove(cartDish.id);
                delete cart2.dishes[cart.dishes.indexOf(cartDish)];
                delete cartDishes[cartDishes.indexOf(cartDish)];
                await cart2.save();
            }
        }
        cart2.dishes = cartDishes;
        await this.countCart(cart2);
        for (let cartDish of cartDishes) {
            if (cartDish.modifiers) {
                for (let modifier of cartDish.modifiers) {
                    modifier.dish = await Dish.findOne(modifier.id);
                }
            }
        }
        getEmitter_1.default().emit('core-cart-after-return-full-cart', cart2);
        cart2.cartId = cart2.id;
        return cart2;
    },
    countCart: async function (cart) {
        getEmitter_1.default().emit('core-cart-before-count', cart);
        const cartDishes = await CartDish.find({ cart: cart.id }).populate('dish');
        const cartDishesClone = {};
        cart.dishes.map(cd => cartDishesClone[cd.id] = _.cloneDeep(cd));
        let cartTotal = 0;
        let dishesCount = 0;
        let uniqueDishes = 0;
        let totalWeight = 0;
        await Promise.map(cartDishes, async (cartDish) => {
            try {
                if (cartDish.dish) {
                    const dish = await Dish.findOne(cartDish.dish.id);
                    if (!dish) {
                        sails.log.error('Dish with id ' + cartDish.dish.id + ' not found!');
                        getEmitter_1.default().emit('core-cart-count-reject-no-dish', cartDish, cart);
                        return sails.log.error('Cart > count > error1', 'Dish with id ' + cartDish.dish.id + ' not found!');
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
                                getEmitter_1.default().emit('core-cart-count-reject-no-modifier-dish', modifier, cart);
                                return sails.log.error('Cart > count > error2', 'Dish with id ' + modifier.id + ' not found!');
                            }
                            cartDish.uniqueItems++;
                            cartDish.itemTotal += modifier.amount * modifierObj.price;
                            cartDish.weight += modifierObj.weight;
                        }
                    }
                    cartDish.totalWeight = cartDish.weight * cartDish.amount;
                    cartDish.itemTotal += cartDish.dish.price;
                    cartDish.itemTotal *= cartDish.amount;
                    await cartDish.save();
                }
                if (cartDish.itemTotal)
                    cartTotal += cartDish.itemTotal;
                dishesCount += cartDish.amount;
                uniqueDishes++;
                totalWeight += cartDish.totalWeight;
            }
            catch (e) {
                sails.log.error('Cart > count > error3', e);
            }
        });
        cart.cartTotal = cartTotal;
        cart.dishesCount = dishesCount;
        cart.uniqueDishes = uniqueDishes;
        cart.totalWeight = totalWeight;
        cart.total = cartTotal;
        for (let cd in cart.dishes) {
            if (cart.dishes.hasOwnProperty(cd)) {
                const cartDish = cartDishes.find(cd1 => cd1.id === cart.dishes[cd].id);
                if (!cartDish)
                    continue;
                cartDish.dish = cartDishesClone[cartDish.id].dish;
                cart.dishes[cd] = cartDish;
            }
        }
        if (cart.delivery) {
            cart.total += cart.delivery;
        }
        getEmitter_1.default().emit('core-cart-after-count', cart);
    }
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
    if (!address.streetId) {
        throw {
            code: 5,
            error: 'address.streetId is required'
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
