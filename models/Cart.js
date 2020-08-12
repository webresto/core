"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
exports.__esModule = true;
var checkExpression_1 = require("../lib/checkExpression");
var actions_1 = require("../lib/actions");
var getEmitter_1 = require("../lib/getEmitter");
var _ = require("lodash");
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
        addDish: function (dish, amount, modifiers, comment, from) {
            return __awaiter(this, arguments, void 0, function () {
                var emitter, dishObj, cart, cartDish;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            emitter = getEmitter_1["default"]();
                            return [4, emitter.emit.apply(emitter, __spreadArrays(['core-cart-before-add-dish'], arguments))];
                        case 1:
                            _a.sent();
                            if (!(typeof dish === "string")) return [3, 3];
                            return [4, Dish.findOne(dish)];
                        case 2:
                            dishObj = _a.sent();
                            if (!dishObj) {
                                throw { body: "Dish with id " + dish + " not found", code: 2 };
                            }
                            return [3, 4];
                        case 3:
                            dishObj = dish;
                            _a.label = 4;
                        case 4:
                            if (!(dishObj.balance !== -1)) return [3, 6];
                            if (!(amount > dishObj.balance)) return [3, 6];
                            return [4, emitter.emit.apply(emitter, __spreadArrays(['core-cart-add-dish-reject-amount'], arguments))];
                        case 5:
                            _a.sent();
                            throw { body: "There is no so mush dishes with id " + dishObj.id, code: 1 };
                        case 6: return [4, Cart.findOne({ id: this.id }).populate('dishes')];
                        case 7:
                            cart = _a.sent();
                            if (modifiers && modifiers.length) {
                                modifiers.forEach(function (m) {
                                    if (!m.amount)
                                        m.amount = 1;
                                });
                            }
                            return [4, emitter.emit.apply(emitter, __spreadArrays(['core-cart-add-dish-before-create-cartdish'], arguments))];
                        case 8:
                            _a.sent();
                            return [4, CartDish.create({
                                    dish: dishObj.id,
                                    cart: this.id,
                                    amount: amount,
                                    modifiers: modifiers || [],
                                    comment: comment,
                                    addedBy: from
                                })];
                        case 9:
                            cartDish = _a.sent();
                            return [4, cart.next('CART')];
                        case 10:
                            _a.sent();
                            return [4, emitter.emit.apply(emitter, __spreadArrays(['core-cart-after-add-dish', cartDish], arguments))];
                        case 11:
                            _a.sent();
                            return [2];
                    }
                });
            });
        },
        removeDish: function (dish, amount, stack) {
            return __awaiter(this, arguments, void 0, function () {
                var emitter, cart, cartDish, get;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            emitter = getEmitter_1["default"]();
                            return [4, emitter.emit.apply(emitter, __spreadArrays(['core-cart-before-remove-dish'], arguments))];
                        case 1:
                            _a.sent();
                            return [4, Cart.findOne({ id: this.id }).populate('dishes')];
                        case 2:
                            cart = _a.sent();
                            if (!stack) return [3, 4];
                            return [4, CartDish.findOne({ where: { cart: cart.id, dish: dish.id }, sort: 'createdAt ASC' }).populate('dish')];
                        case 3:
                            cartDish = _a.sent();
                            return [3, 6];
                        case 4: return [4, CartDish.findOne({ cart: cart.id, id: dish.id }).populate('dish')];
                        case 5:
                            cartDish = _a.sent();
                            _a.label = 6;
                        case 6:
                            if (!!cartDish) return [3, 8];
                            return [4, emitter.emit.apply(emitter, __spreadArrays(['core-cart-remove-dish-reject-no-cartdish'], arguments))];
                        case 7:
                            _a.sent();
                            throw { body: "CartDish with id " + dish.id + " in cart with id " + this.id + " not found", code: 1 };
                        case 8:
                            get = cartDish;
                            get.amount -= amount;
                            if (!(get.amount > 0)) return [3, 10];
                            return [4, CartDish.update({ id: get.id }, { amount: get.amount })];
                        case 9:
                            _a.sent();
                            return [3, 11];
                        case 10:
                            get.destroy();
                            _a.label = 11;
                        case 11: return [4, cart.next('CART')];
                        case 12:
                            _a.sent();
                            return [4, emitter.emit.apply(emitter, __spreadArrays(['core-cart-after-remove-dish'], arguments))];
                        case 13:
                            _a.sent();
                            return [2];
                    }
                });
            });
        },
        setCount: function (dish, amount) {
            return __awaiter(this, arguments, void 0, function () {
                var emitter, cart, cartDishes, get;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            emitter = getEmitter_1["default"]();
                            return [4, emitter.emit.apply(emitter, __spreadArrays(['core-cart-before-set-count'], arguments))];
                        case 1:
                            _a.sent();
                            if (!(dish.dish.balance !== -1)) return [3, 3];
                            if (!(amount > dish.dish.balance)) return [3, 3];
                            return [4, emitter.emit.apply(emitter, __spreadArrays(['core-cart-set-count-reject-amount'], arguments))];
                        case 2:
                            _a.sent();
                            throw { body: "There is no so mush dishes with id " + dish.dish.id, code: 1 };
                        case 3: return [4, Cart.findOne(this.id).populate('dishes')];
                        case 4:
                            cart = _a.sent();
                            return [4, CartDish.find({ cart: cart.id }).populate('dish')];
                        case 5:
                            cartDishes = _a.sent();
                            get = cartDishes.find(function (item) { return item.id === dish.id; });
                            if (!get) return [3, 11];
                            get.amount = amount;
                            if (!(get.amount > 0)) return [3, 7];
                            return [4, CartDish.update({ id: get.id }, { amount: get.amount })];
                        case 6:
                            _a.sent();
                            return [3, 8];
                        case 7:
                            get.destroy();
                            sails.log.info('destroy', get.id);
                            _a.label = 8;
                        case 8: return [4, cart.next('CART')];
                        case 9:
                            _a.sent();
                            return [4, emitter.emit.apply(emitter, __spreadArrays(['core-cart-after-set-count'], arguments))];
                        case 10:
                            _a.sent();
                            return [3, 13];
                        case 11: return [4, emitter.emit.apply(emitter, __spreadArrays(['core-cart-set-count-reject-no-cartdish'], arguments))];
                        case 12:
                            _a.sent();
                            throw { body: "CartDish dish id " + dish.id + " not found", code: 2 };
                        case 13: return [2];
                    }
                });
            });
        },
        setModifierCount: function (dish, modifier, amount) {
            return __awaiter(this, arguments, void 0, function () {
                var emitter, cartDishes, get, dish1, getModif, getMofifFromDish;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            emitter = getEmitter_1["default"]();
                            return [4, emitter.emit.apply(emitter, __spreadArrays(['core-cart-before-set-modifier-count'], arguments))];
                        case 1:
                            _a.sent();
                            if (!(modifier.balance !== -1)) return [3, 3];
                            if (!(amount > modifier.balance)) return [3, 3];
                            return [4, emitter.emit.apply(emitter, __spreadArrays(['core-cart-set-modifier-count-reject-amount'], arguments))];
                        case 2:
                            _a.sent();
                            throw { body: "There is no so mush dishes with id " + modifier.id, code: 1 };
                        case 3: return [4, CartDish.find({ cart: this.id }).populate('dish').populate('modifiers')];
                        case 4:
                            cartDishes = _a.sent();
                            get = cartDishes.filter(function (item) { return item.dish.id === dish.id; })[0];
                            if (!!get) return [3, 6];
                            return [4, emitter.emit.apply(emitter, __spreadArrays(['core-cart-set-modifier-count-reject-no-cartdish'], arguments))];
                        case 5:
                            _a.sent();
                            throw { body: "CartDish dish id " + dish.id + " not found", code: 2 };
                        case 6: return [4, Dish.findOne({ id: dish.id })];
                        case 7:
                            dish1 = _a.sent();
                            getModif = dish1.modifiers.find(function (item) { return item.id === modifier.id; });
                            if (!!getModif) return [3, 9];
                            return [4, emitter.emit.apply(emitter, __spreadArrays(['core-cart-set-modifier-count-reject-no-modifier-dish'], arguments))];
                        case 8:
                            _a.sent();
                            throw { body: "Dish dish id " + getModif.id + " not found", code: 3 };
                        case 9:
                            getMofifFromDish = get.modifiers.filter(function (item) { return modifier.id === item.dish.id; })[0];
                            if (!!getMofifFromDish) return [3, 11];
                            return [4, emitter.emit.apply(emitter, __spreadArrays(['core-cart-set-modifier-count-reject-no-modifier-in-dish'], arguments))];
                        case 10:
                            _a.sent();
                            throw { body: "Modifier " + modifier.id + " in dish id " + dish.id + " not found", code: 4 };
                        case 11:
                            getMofifFromDish.amount = amount;
                            return [4, CartDish.update({ id: getMofifFromDish.id }, { amount: getMofifFromDish.amount })];
                        case 12:
                            _a.sent();
                            return [4, this.next('CART')];
                        case 13:
                            _a.sent();
                            return [4, emitter.emit.apply(emitter, __spreadArrays(['core-cart-after-set-modifier-count'], arguments))];
                        case 14:
                            _a.sent();
                            return [2];
                    }
                });
            });
        },
        setComment: function (dish, comment) {
            return __awaiter(this, arguments, void 0, function () {
                var emitter, cart, cartDish;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            emitter = getEmitter_1["default"]();
                            return [4, emitter.emit.apply(emitter, __spreadArrays(['core-cart-before-set-comment'], arguments))];
                        case 1:
                            _a.sent();
                            return [4, Cart.findOne(this.id).populate('dishes')];
                        case 2:
                            cart = _a.sent();
                            return [4, CartDish.findOne({ cart: cart.id, id: dish.id }).populate('dish')];
                        case 3:
                            cartDish = _a.sent();
                            if (!cartDish) return [3, 8];
                            return [4, CartDish.update(cartDish.id, { comment: comment })];
                        case 4:
                            _a.sent();
                            return [4, cart.next('CART')];
                        case 5:
                            _a.sent();
                            return [4, this.countCart(cart)];
                        case 6:
                            _a.sent();
                            return [4, emitter.emit.apply(emitter, __spreadArrays(['core-cart-after-set-comment'], arguments))];
                        case 7:
                            _a.sent();
                            return [3, 10];
                        case 8: return [4, emitter.emit.apply(emitter, __spreadArrays(['core-cart-set-comment-reject-no-cartdish'], arguments))];
                        case 9:
                            _a.sent();
                            throw { body: "CartDish with id " + dish.id + " not found", code: 1 };
                        case 10: return [2];
                    }
                });
            });
        },
        setSelfDelivery: function (selfService) {
            return __awaiter(this, void 0, void 0, function () {
                var self;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            self = this;
                            sails.log.verbose('Cart > setSelfDelivery >', selfService);
                            return [4, actions_1["default"].reset(this.id)];
                        case 1:
                            _a.sent();
                            self.selfDelivery = selfService;
                            return [4, self.save()];
                        case 2:
                            _a.sent();
                            return [2];
                    }
                });
            });
        },
        check: function (customer, isSelfService, address, paymentMethodId) {
            return __awaiter(this, void 0, void 0, function () {
                var self, paymentMethod, results, resultsCount, successCount, checkConfig;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            self = this;
                            if (self.paid)
                                return [2, false];
                            if (!paymentMethodId) return [3, 2];
                            return [4, PaymentMethod.findOne(paymentMethodId)];
                        case 1:
                            paymentMethod = _a.sent();
                            if (!paymentMethod || !paymentMethod.enable) {
                                return [2, false];
                            }
                            else {
                                sails.log.verbose('Check > PaymentMethod > ', paymentMethod);
                            }
                            _a.label = 2;
                        case 2:
                            getEmitter_1["default"]().emit('core-cart-before-check', self, customer, isSelfService, address);
                            sails.log.verbose('Cart > check > before check >', customer, isSelfService, address);
                            return [4, checkCustomerInfo(customer)];
                        case 3:
                            _a.sent();
                            checkPaymentMethod(paymentMethod);
                            self.customer = customer;
                            return [4, self.save()];
                        case 4:
                            _a.sent();
                            if (!isSelfService) return [3, 7];
                            getEmitter_1["default"]().emit('core-cart-check-self-service', self, customer, isSelfService, address);
                            sails.log.verbose('Cart > check > is self delivery');
                            return [4, self.setSelfDelivery(true)];
                        case 5:
                            _a.sent();
                            return [4, self.next()];
                        case 6:
                            _a.sent();
                            return [2, true];
                        case 7:
                            getEmitter_1["default"]().emit('core-cart-check-delivery', self, customer, isSelfService, address);
                            checkAddress(address);
                            self.address = address;
                            return [4, self.save()];
                        case 8:
                            _a.sent();
                            return [4, getEmitter_1["default"]().emit('core-cart-check', self, customer, isSelfService, address)];
                        case 9:
                            results = _a.sent();
                            sails.log.verbose('Cart > check > after wait general emitter', results);
                            resultsCount = results.length;
                            successCount = results.filter(function (r) { return r.state === "success"; }).length;
                            getEmitter_1["default"]().emit('core-cart-after-check', self, customer, isSelfService, address);
                            if (resultsCount === 0)
                                return [2, true];
                            return [4, SystemInfo.use('check')];
                        case 10:
                            checkConfig = _a.sent();
                            if (!checkConfig) return [3, 16];
                            if (!checkConfig.requireAll) return [3, 13];
                            if (!(resultsCount === successCount)) return [3, 12];
                            if (!(self.getState() !== 'CHECKOUT')) return [3, 12];
                            return [4, self.next()];
                        case 11:
                            _a.sent();
                            _a.label = 12;
                        case 12: return [2, resultsCount === successCount];
                        case 13:
                            if (!checkConfig.notRequired) return [3, 16];
                            if (!(self.getState() === 'CHECKOUT')) return [3, 15];
                            return [4, self.next()];
                        case 14:
                            _a.sent();
                            _a.label = 15;
                        case 15: return [2, true];
                        case 16:
                            if (!(successCount > 0)) return [3, 18];
                            if (!(self.getState() === 'CHECKOUT')) return [3, 18];
                            return [4, self.next()];
                        case 17:
                            _a.sent();
                            _a.label = 18;
                        case 18: return [2, successCount > 0];
                    }
                });
            });
        },
        order: function () {
            return __awaiter(this, void 0, void 0, function () {
                var self, results, resultsCount, successCount, orderConfig;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            self = this;
                            if (self.paid)
                                return [2, 3];
                            getEmitter_1["default"]().emit('core-cart-before-order', self);
                            sails.log.verbose('Cart > order > before order >', self.customer, self.selfDelivery, self.address);
                            if (this.selfDelivery) {
                                getEmitter_1["default"]().emit('core-cart-order-self-service', self);
                            }
                            else {
                                getEmitter_1["default"]().emit('core-cart-order-delivery', self);
                            }
                            return [4, getEmitter_1["default"]().emit('core-cart-order', self)];
                        case 1:
                            results = _a.sent();
                            sails.log.verbose('Cart > order > after wait general emitter', results);
                            resultsCount = results.length;
                            successCount = results.filter(function (r) { return r.state === "success"; }).length;
                            getEmitter_1["default"]().emit('core-cart-after-order', self);
                            return [4, SystemInfo.use('order')];
                        case 2:
                            orderConfig = _a.sent();
                            if (!orderConfig) return [3, 7];
                            if (!orderConfig.requireAll) return [3, 5];
                            if (!(resultsCount === successCount)) return [3, 4];
                            return [4, self.next()];
                        case 3:
                            _a.sent();
                            return [2, 0];
                        case 4:
                            if (successCount === 0) {
                                return [2, 1];
                            }
                            else {
                                return [2, 2];
                            }
                            _a.label = 5;
                        case 5:
                            if (!orderConfig.notRequired) return [3, 7];
                            return [4, self.next()];
                        case 6:
                            _a.sent();
                            return [2, 0];
                        case 7:
                            if (!(successCount > 0)) return [3, 9];
                            return [4, self.next()];
                        case 8:
                            _a.sent();
                            return [2, 0];
                        case 9: return [2, 1];
                    }
                });
            });
        }
    },
    payment: function () {
        return __awaiter(this, void 0, void 0, function () {
            var self;
            return __generator(this, function (_a) {
                self = this;
                if (!self.paymentMethod) {
                    return [2, false];
                }
                return [2, true];
            });
        });
    },
    beforeCreate: function (values, next) {
        var _this = this;
        getEmitter_1["default"]().emit('core-cart-before-create', values).then(function () {
            _this.countCart(values).then(next, next);
        });
    },
    afterUpdate: function (values, next) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                getEmitter_1["default"]().emit('core-cart-after-update', values).then(function () {
                    var self = _this;
                    sails.log.verbose('Cart > afterUpdate > ', values);
                    if (self.paid && self.getState() === 'PAYMENT')
                        self.order();
                    next();
                });
                return [2];
            });
        });
    },
    returnFullCart: function (cart) {
        return __awaiter(this, void 0, void 0, function () {
            var cart2, cartDishes, _loop_1, _i, cartDishes_1, cartDish, _a, cartDishes_2, cartDish, _b, _c, modifier, _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        getEmitter_1["default"]().emit('core-cart-before-return-full-cart', cart);
                        return [4, Cart.findOne({ id: cart.id }).populate('dishes')];
                    case 1:
                        cart2 = _e.sent();
                        return [4, CartDish.find({ cart: cart.id }).populate('dish').sort('createdAt')];
                    case 2:
                        cartDishes = _e.sent();
                        _loop_1 = function (cartDish) {
                            var dish, reason, reasonG, reasonBool;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        if (!cartDish.dish) {
                                            sails.log.error('cartDish', cartDish.id, 'has not dish');
                                            return [2, "continue"];
                                        }
                                        if (!cart2.dishes.filter(function (d) { return d.id === cartDish.id; }).length) {
                                            sails.log.error('cartDish', cartDish.id, 'not exists in cart', cart.id);
                                            return [2, "continue"];
                                        }
                                        return [4, Dish.findOne({
                                                id: cartDish.dish.id,
                                                isDeleted: false
                                            }).populate('images').populate('parentGroup')];
                                    case 1:
                                        dish = _a.sent();
                                        reason = checkExpression_1["default"](dish);
                                        reasonG = checkExpression_1["default"](dish.parentGroup);
                                        reasonBool = reason === 'promo' || reason === 'visible' || !reason || reasonG === 'promo' ||
                                            reasonG === 'visible' || !reasonG;
                                        if (!(dish && dish.parentGroup && reasonBool && (dish.balance === -1 ? true : dish.balance >= cartDish.amount))) return [3, 3];
                                        return [4, Dish.getDishModifiers(dish)];
                                    case 2:
                                        _a.sent();
                                        cartDish.dish = dish;
                                        return [3, 6];
                                    case 3:
                                        sails.log.info('destroy', dish.id);
                                        getEmitter_1["default"]().emit('core-cart-return-full-cart-destroy-cartdish', dish, cart);
                                        return [4, CartDish.destroy(dish)];
                                    case 4:
                                        _a.sent();
                                        cart2.dishes.remove(cartDish.id);
                                        delete cart2.dishes[cart.dishes.indexOf(cartDish)];
                                        delete cartDishes[cartDishes.indexOf(cartDish)];
                                        return [4, cart2.save()];
                                    case 5:
                                        _a.sent();
                                        _a.label = 6;
                                    case 6: return [2];
                                }
                            });
                        };
                        _i = 0, cartDishes_1 = cartDishes;
                        _e.label = 3;
                    case 3:
                        if (!(_i < cartDishes_1.length)) return [3, 6];
                        cartDish = cartDishes_1[_i];
                        return [5, _loop_1(cartDish)];
                    case 4:
                        _e.sent();
                        _e.label = 5;
                    case 5:
                        _i++;
                        return [3, 3];
                    case 6:
                        cart2.dishes = cartDishes;
                        return [4, this.countCart(cart2)];
                    case 7:
                        _e.sent();
                        _a = 0, cartDishes_2 = cartDishes;
                        _e.label = 8;
                    case 8:
                        if (!(_a < cartDishes_2.length)) return [3, 13];
                        cartDish = cartDishes_2[_a];
                        if (!cartDish.modifiers) return [3, 12];
                        _b = 0, _c = cartDish.modifiers;
                        _e.label = 9;
                    case 9:
                        if (!(_b < _c.length)) return [3, 12];
                        modifier = _c[_b];
                        _d = modifier;
                        return [4, Dish.findOne(modifier.id)];
                    case 10:
                        _d.dish = _e.sent();
                        _e.label = 11;
                    case 11:
                        _b++;
                        return [3, 9];
                    case 12:
                        _a++;
                        return [3, 8];
                    case 13:
                        getEmitter_1["default"]().emit('core-cart-after-return-full-cart', cart2);
                        cart2.cartId = cart2.id;
                        return [2, cart2];
                }
            });
        });
    },
    countCart: function (cart) {
        return __awaiter(this, void 0, void 0, function () {
            var cartDishes, cartDishesClone, cartTotal, dishesCount, uniqueDishes, totalWeight, _loop_2, cd;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        getEmitter_1["default"]().emit('core-cart-before-count', cart);
                        return [4, CartDish.find({ cart: cart.id }).populate('dish')];
                    case 1:
                        cartDishes = _a.sent();
                        cartDishesClone = {};
                        cart.dishes.map(function (cd) { return cartDishesClone[cd.id] = _.cloneDeep(cd); });
                        cartTotal = 0;
                        dishesCount = 0;
                        uniqueDishes = 0;
                        totalWeight = 0;
                        return [4, Promise.map(cartDishes, function (cartDish) { return __awaiter(_this, void 0, void 0, function () {
                                var dish, _i, _a, modifier, modifierObj, e_1;
                                return __generator(this, function (_b) {
                                    switch (_b.label) {
                                        case 0:
                                            _b.trys.push([0, 8, , 9]);
                                            if (!cartDish.dish) return [3, 7];
                                            return [4, Dish.findOne(cartDish.dish.id)];
                                        case 1:
                                            dish = _b.sent();
                                            if (!dish) {
                                                sails.log.error('Dish with id ' + cartDish.dish.id + ' not found!');
                                                getEmitter_1["default"]().emit('core-cart-count-reject-no-dish', cartDish, cart);
                                                return [2, sails.log.error('Cart > count > error1', 'Dish with id ' + cartDish.dish.id + ' not found!')];
                                            }
                                            cartDish.uniqueItems = 1;
                                            cartDish.itemTotal = 0;
                                            cartDish.weight = cartDish.dish.weight;
                                            cartDish.totalWeight = 0;
                                            if (!cartDish.modifiers) return [3, 5];
                                            _i = 0, _a = cartDish.modifiers;
                                            _b.label = 2;
                                        case 2:
                                            if (!(_i < _a.length)) return [3, 5];
                                            modifier = _a[_i];
                                            return [4, Dish.findOne(modifier.id)];
                                        case 3:
                                            modifierObj = _b.sent();
                                            if (!modifierObj) {
                                                sails.log.error('Dish with id ' + modifier.id + ' not found!');
                                                getEmitter_1["default"]().emit('core-cart-count-reject-no-modifier-dish', modifier, cart);
                                                return [2, sails.log.error('Cart > count > error2', 'Dish with id ' + modifier.id + ' not found!')];
                                            }
                                            cartDish.uniqueItems++;
                                            cartDish.itemTotal += modifier.amount * modifierObj.price;
                                            cartDish.weight += modifierObj.weight;
                                            _b.label = 4;
                                        case 4:
                                            _i++;
                                            return [3, 2];
                                        case 5:
                                            cartDish.totalWeight = cartDish.weight * cartDish.amount;
                                            cartDish.itemTotal += cartDish.dish.price;
                                            cartDish.itemTotal *= cartDish.amount;
                                            return [4, cartDish.save()];
                                        case 6:
                                            _b.sent();
                                            _b.label = 7;
                                        case 7:
                                            if (cartDish.itemTotal)
                                                cartTotal += cartDish.itemTotal;
                                            dishesCount += cartDish.amount;
                                            uniqueDishes++;
                                            totalWeight += cartDish.totalWeight;
                                            return [3, 9];
                                        case 8:
                                            e_1 = _b.sent();
                                            sails.log.error('Cart > count > error3', e_1);
                                            return [3, 9];
                                        case 9: return [2];
                                    }
                                });
                            }); })];
                    case 2:
                        _a.sent();
                        cart.cartTotal = cartTotal;
                        cart.dishesCount = dishesCount;
                        cart.uniqueDishes = uniqueDishes;
                        cart.totalWeight = totalWeight;
                        cart.total = cartTotal;
                        _loop_2 = function (cd) {
                            if (cart.dishes.hasOwnProperty(cd)) {
                                var cartDish = cartDishes.find(function (cd1) { return cd1.id === cart.dishes[cd].id; });
                                if (!cartDish)
                                    return "continue";
                                cartDish.dish = cartDishesClone[cartDish.id].dish;
                                cart.dishes[cd] = cartDish;
                            }
                        };
                        for (cd in cart.dishes) {
                            _loop_2(cd);
                        }
                        if (cart.delivery) {
                            cart.total += cart.delivery;
                        }
                        getEmitter_1["default"]().emit('core-cart-after-count', cart);
                        return [2];
                }
            });
        });
    }
};
function checkCustomerInfo(customer) {
    return __awaiter(this, void 0, void 0, function () {
        var nameRegex, phoneRegex;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
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
                    return [4, SystemInfo.use('nameRegex')];
                case 1:
                    nameRegex = _a.sent();
                    return [4, SystemInfo.use('phoneRegex')];
                case 2:
                    phoneRegex = _a.sent();
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
                    return [2];
            }
        });
    });
}
function checkAddress(address) {
    if (!address.street) {
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
function checkPaymentMethod(paymentMethod) {
    if (paymentMethod) {
        throw {
            code: 8,
            error: 'paymentMethod is required'
        };
    }
}
