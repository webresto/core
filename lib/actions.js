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
exports.__esModule = true;
exports.getAllActionsName = exports.addAction = void 0;
var actions = {
    addDish: function (params) {
        return __awaiter(this, void 0, void 0, function () {
            var cartId, dishesId, cart;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        cartId = params.cartId;
                        dishesId = params.dishesId;
                        if (!cartId)
                            throw 'cartId (string) is required as first element of params';
                        if (!dishesId || !dishesId.length)
                            throw 'dishIds (array of strings) is required as second element of params';
                        return [4, Cart.findOne(cartId)];
                    case 1:
                        cart = _a.sent();
                        if (!cart)
                            throw 'cart with id ' + cartId + ' not found';
                        return [4, Promise.each(dishesId, function (dishId) { return __awaiter(_this, void 0, void 0, function () {
                                var dish;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4, Dish.findOne(dishId)];
                                        case 1:
                                            dish = _a.sent();
                                            return [4, cart.addDish(dish, params.amount, params.modifiers, params.comment, 'delivery')];
                                        case 2:
                                            _a.sent();
                                            return [2];
                                    }
                                });
                            }); })];
                    case 2:
                        _a.sent();
                        return [2, cart];
                }
            });
        });
    },
    delivery: function (params) {
        return __awaiter(this, void 0, void 0, function () {
            var cartId, deliveryCost, deliveryItem, cart, item;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        cartId = params.cartId;
                        deliveryCost = params.deliveryCost;
                        deliveryItem = params.deliveryItem;
                        if (!cartId)
                            throw 'cartId (string) is required as first element of params';
                        if (deliveryCost === undefined && !deliveryItem)
                            throw 'one of deliveryCost or deliveryItem is required';
                        if (deliveryCost && typeof deliveryCost !== 'number')
                            throw 'deliveryCost (float) is required as second element of params';
                        if (deliveryItem && typeof deliveryItem !== 'string')
                            throw 'deliveryCost (string) is required as second element of params';
                        return [4, Cart.findOne(cartId)];
                    case 1:
                        cart = _a.sent();
                        if (!cart)
                            throw 'cart with id ' + cartId + ' not found';
                        if (!deliveryItem) return [3, 3];
                        return [4, Dish.findOne({ rmsId: deliveryItem })];
                    case 2:
                        item = _a.sent();
                        if (!item)
                            throw 'deliveryItem with rmsId ' + deliveryItem + ' not found';
                        cart.delivery = item.price;
                        cart.deliveryItem = item.id;
                        return [3, 4];
                    case 3:
                        cart.delivery = deliveryCost;
                        _a.label = 4;
                    case 4:
                        cart.deliveryStatus = 0;
                        if (!(cart.state !== 'CHECKOUT')) return [3, 6];
                        return [4, cart.next()];
                    case 5:
                        _a.sent();
                        _a.label = 6;
                    case 6: return [4, cart.save()];
                    case 7:
                        _a.sent();
                        return [2, cart];
                }
            });
        });
    },
    reset: function (cartId) {
        return __awaiter(this, void 0, void 0, function () {
            var cart, removeDishes;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!cartId)
                            throw 'cartId (string) is required as first element of params';
                        return [4, Cart.findOne(cartId)];
                    case 1:
                        cart = _a.sent();
                        if (!cart)
                            throw 'cart with id ' + cartId + ' not found';
                        cart.delivery = 0;
                        cart.deliveryStatus = null;
                        cart.deliveryDescription = "";
                        cart.message = "";
                        return [4, cart.next('CART')];
                    case 2:
                        _a.sent();
                        return [4, CartDish.find({ cart: cart.id, addedBy: 'delivery' })];
                    case 3:
                        removeDishes = _a.sent();
                        return [4, Promise.each(removeDishes, function (dish) {
                                cart.removeDish(dish, 100000);
                            })];
                    case 4:
                        _a.sent();
                        return [2, cart];
                }
            });
        });
    },
    setDeliveryDescription: function (params) {
        return __awaiter(this, void 0, void 0, function () {
            var cartId, description, cart;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        cartId = params.cartId;
                        description = params.description;
                        if (!cartId)
                            throw 'cartId (string) is required as first element of params';
                        if (!description) {
                            throw 'description (string) is required as second element of params';
                        }
                        return [4, Cart.findOne(cartId)];
                    case 1:
                        cart = _a.sent();
                        if (!cart)
                            throw 'cart with id ' + cartId + ' not found';
                        cart.deliveryDescription = cart.deliveryDescription || "";
                        cart.deliveryDescription += description + '\n';
                        return [4, cart.save()];
                    case 2:
                        _a.sent();
                        return [2, cart];
                }
            });
        });
    },
    reject: function (params) {
        return __awaiter(this, void 0, void 0, function () {
            var cartId, cart;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        cartId = params.cartId;
                        if (!cartId)
                            throw 'cartId (string) is required as first element of params';
                        return [4, Cart.findOne(cartId)];
                    case 1:
                        cart = _a.sent();
                        if (!cart) {
                            throw 'cart with id ' + cartId + ' not found';
                        }
                        cart.deliveryStatus = null;
                        return [4, cart.next('CART')];
                    case 2:
                        _a.sent();
                        return [2, cart];
                }
            });
        });
    },
    setMessage: function (params) {
        return __awaiter(this, void 0, void 0, function () {
            var cartId, message, cart;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        cartId = params.cartId;
                        message = params.message;
                        if (!cartId)
                            throw 'cartId (string) is required as first element of params';
                        if (!message)
                            throw 'description (string) is required as second element of params';
                        return [4, Cart.findOne(cartId)];
                    case 1:
                        cart = _a.sent();
                        if (!cart)
                            throw 'cart with id ' + cartId + ' not found';
                        cart.message = message;
                        return [4, cart.save()];
                    case 2:
                        _a.sent();
                        return [2, cart];
                }
            });
        });
    },
    "return": function () {
        return 0;
    }
};
exports["default"] = actions;
function addAction(name, fn) {
    actions[name] = fn;
}
exports.addAction = addAction;
function getAllActionsName() {
    return Object.keys(actions);
}
exports.getAllActionsName = getAllActionsName;
