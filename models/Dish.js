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
var checkExpression_1 = require("../lib/checkExpression");
var hashCode_1 = require("../lib/hashCode");
var getEmitter_1 = require("../lib/getEmitter");
module.exports = {
    attributes: {
        id: {
            type: 'string',
            required: true,
            primaryKey: true
        },
        rmsId: {
            type: 'string',
            required: true
        },
        additionalInfo: 'string',
        code: 'string',
        description: 'string',
        name: 'string',
        seoDescription: 'string',
        seoKeywords: 'string',
        seoText: 'string',
        seoTitle: 'string',
        carbohydrateAmount: 'float',
        carbohydrateFullAmount: 'float',
        differentPricesOn: 'array',
        doNotPrintInCheque: 'boolean',
        energyAmount: 'float',
        energyFullAmount: 'float',
        fatAmount: 'float',
        fatFullAmount: 'float',
        fiberAmount: 'float',
        fiberFullAmount: 'float',
        groupId: 'string',
        groupModifiers: 'array',
        measureUnit: 'string',
        price: 'float',
        productCategoryId: 'string',
        prohibitedToSaleOn: 'array',
        type: 'string',
        useBalanceForSell: 'boolean',
        weight: 'float',
        isIncludedInMenu: 'boolean',
        order: 'float',
        isDeleted: 'boolean',
        modifiers: {
            type: 'json'
        },
        parentGroup: {
            model: 'group'
        },
        tags: {
            type: 'json'
        },
        balance: {
            type: 'integer',
            defaultsTo: -1
        },
        images: {
            collection: 'image',
            via: 'dish'
        },
        slug: {
            type: 'slug',
            from: 'name'
        },
        hash: 'integer',
        composition: 'string',
        visible: 'boolean',
        modifier: 'boolean',
        promo: 'boolean',
        workTime: 'json'
    },
    getDishes: function (criteria) {
        if (criteria === void 0) { criteria = {}; }
        return __awaiter(this, void 0, void 0, function () {
            var dishes;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        criteria.isDeleted = false;
                        criteria.balance = { '!': 0 };
                        return [4, Dish.find(criteria).populate('images')];
                    case 1:
                        dishes = _a.sent();
                        return [4, Promise.each(dishes, function (dish) { return __awaiter(_this, void 0, void 0, function () {
                                var reason;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            reason = checkExpression_1["default"](dish);
                                            if (!!reason) return [3, 2];
                                            return [4, Dish.getDishModifiers(dish)];
                                        case 1:
                                            _a.sent();
                                            if (dish.images.length >= 2)
                                                dish.images.sort(function (a, b) { return b.uploadDate.localeCompare(a.uploadDate); });
                                            return [3, 3];
                                        case 2:
                                            dishes.splice(dishes.indexOf(dish), 1);
                                            _a.label = 3;
                                        case 3: return [2];
                                    }
                                });
                            }); })];
                    case 2:
                        _a.sent();
                        dishes.sort(function (a, b) { return a.order - b.order; });
                        return [4, getEmitter_1["default"]().emit('core-dish-get-dishes', dishes)];
                    case 3:
                        _a.sent();
                        return [2, dishes];
                }
            });
        });
    },
    getDishModifiers: function (dish) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4, Promise.map(dish.modifiers, function (modifier, index) { return __awaiter(_this, void 0, void 0, function () {
                            var _a, _b;
                            var _this = this;
                            return __generator(this, function (_c) {
                                switch (_c.label) {
                                    case 0:
                                        if (!(modifier.childModifiers && modifier.childModifiers.length > 0)) return [3, 3];
                                        _a = dish.modifiers[index];
                                        return [4, Group.findOne({ id: modifier.modifierId })];
                                    case 1:
                                        _a.group = _c.sent();
                                        return [4, Promise.map(modifier.childModifiers, function (modifier, index1) { return __awaiter(_this, void 0, void 0, function () {
                                                var _a;
                                                return __generator(this, function (_b) {
                                                    switch (_b.label) {
                                                        case 0:
                                                            _a = dish.modifiers[index].childModifiers[index1];
                                                            return [4, Dish.findOne({ id: modifier.modifierId })];
                                                        case 1:
                                                            _a.dish = _b.sent();
                                                            return [2];
                                                    }
                                                });
                                            }); })];
                                    case 2:
                                        _c.sent();
                                        return [3, 5];
                                    case 3:
                                        _b = dish.modifiers[index];
                                        return [4, Dish.findOne({ id: modifier.id })];
                                    case 4:
                                        _b.dish = _c.sent();
                                        _c.label = 5;
                                    case 5: return [2];
                                }
                            });
                        }); })];
                    case 1:
                        _a.sent();
                        return [2];
                }
            });
        });
    },
    createOrUpdate: function (values) {
        return __awaiter(this, void 0, void 0, function () {
            var dish;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4, Dish.findOne({ id: values.id })];
                    case 1:
                        dish = _a.sent();
                        if (!!dish) return [3, 2];
                        return [2, Dish.create(values)];
                    case 2:
                        if (hashCode_1["default"](JSON.stringify(values)) === dish.hash) {
                            return [2, dish];
                        }
                        return [4, Dish.update({ id: values.id }, values)];
                    case 3: return [2, (_a.sent())[0]];
                }
            });
        });
    }
};
