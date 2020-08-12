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
var getEmitter_1 = require("../lib/getEmitter");
module.exports = {
    attributes: {
        id: {
            type: 'string',
            required: true,
            primaryKey: true
        },
        additionalInfo: 'string',
        code: 'float',
        description: 'string',
        isDeleted: 'boolean',
        name: 'string',
        seoDescription: 'string',
        seoKeywords: 'string',
        seoText: 'string',
        seoTitle: 'string',
        tags: {
            type: 'json'
        },
        isIncludedInMenu: 'boolean',
        order: 'float',
        dishesTags: {
            type: 'json'
        },
        dishes: {
            collection: 'dish',
            via: 'productCategoryId'
        },
        parentGroup: {
            model: 'group'
        },
        childGroups: {
            collection: 'group',
            via: 'parentGroup'
        },
        images: {
            collection: 'image',
            via: 'group'
        },
        slug: {
            type: 'slug',
            from: 'name'
        },
        visible: 'boolean',
        modifier: 'boolean',
        promo: 'boolean',
        workTime: 'json'
    },
    getGroups: function (groupsId) {
        return __awaiter(this, void 0, void 0, function () {
            var menu, groups, errors, res;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        menu = {};
                        return [4, Group.find({
                                id: groupsId,
                                isDeleted: false
                            }).populate('childGroups')
                                .populate('dishes')
                                .populate('images')];
                    case 1:
                        groups = _a.sent();
                        errors = {};
                        return [4, Promise.each(groups, function (group) { return __awaiter(_this, void 0, void 0, function () {
                                var reason, childGroups_1, cgs, _a;
                                var _this = this;
                                return __generator(this, function (_b) {
                                    switch (_b.label) {
                                        case 0:
                                            reason = checkExpression_1["default"](group);
                                            if (!!reason) return [3, 5];
                                            menu[group.id] = group;
                                            if (!group.childGroups) return [3, 3];
                                            childGroups_1 = [];
                                            return [4, Group.find({ id: group.childGroups.map(function (cg) { return cg.id; }) })
                                                    .populate('childGroups')
                                                    .populate('dishes')
                                                    .populate('images')];
                                        case 1:
                                            cgs = _b.sent();
                                            return [4, Promise.each(cgs, function (cg) { return __awaiter(_this, void 0, void 0, function () {
                                                    var data, e_1;
                                                    return __generator(this, function (_a) {
                                                        switch (_a.label) {
                                                            case 0:
                                                                _a.trys.push([0, 2, , 3]);
                                                                return [4, Group.getGroup(cg.id)];
                                                            case 1:
                                                                data = _a.sent();
                                                                if (data)
                                                                    childGroups_1.push(data);
                                                                return [3, 3];
                                                            case 2:
                                                                e_1 = _a.sent();
                                                                return [3, 3];
                                                            case 3: return [2];
                                                        }
                                                    });
                                                }); })];
                                        case 2:
                                            _b.sent();
                                            delete menu[group.id].childGroups;
                                            menu[group.id].children = childGroups_1;
                                            if (menu[group.id].children.length > 1)
                                                menu[group.id].children.sort(function (a, b) { return a.order - b.order; });
                                            _b.label = 3;
                                        case 3:
                                            _a = menu[group.id];
                                            return [4, Dish.getDishes({ parentGroup: group.id })];
                                        case 4:
                                            _a.dishesList = _b.sent();
                                            return [3, 6];
                                        case 5:
                                            errors[group.id] = reason;
                                            _b.label = 6;
                                        case 6: return [2];
                                    }
                                });
                            }); })];
                    case 2:
                        _a.sent();
                        return [4, getEmitter_1["default"]().emit('core-group-get-groups', menu, errors)];
                    case 3:
                        _a.sent();
                        res = Object.values(menu);
                        return [2, { groups: res, errors: errors }];
                }
            });
        });
    },
    getGroup: function (groupId) {
        return __awaiter(this, void 0, void 0, function () {
            var result, group;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4, this.getGroups([groupId])];
                    case 1:
                        result = _a.sent();
                        if (result.errors[0]) {
                            throw result.errors[0];
                        }
                        group = result.groups;
                        return [2, group[0] ? group[0] : null];
                }
            });
        });
    },
    getGroupBySlug: function (groupSlug) {
        return __awaiter(this, void 0, void 0, function () {
            var groupObj, result, group;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4, Group.findOne({ slug: groupSlug })];
                    case 1:
                        groupObj = _a.sent();
                        return [4, this.getGroups([groupObj.id])];
                    case 2:
                        result = _a.sent();
                        if (result.errors[0]) {
                            throw result.errors[0];
                        }
                        group = result.groups;
                        return [2, group[0] ? group[0] : null];
                }
            });
        });
    },
    createOrUpdate: function (values) {
        return __awaiter(this, void 0, void 0, function () {
            var group;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4, Group.findOne({ id: values.id })];
                    case 1:
                        group = _a.sent();
                        if (!!group) return [3, 2];
                        return [2, Group.create(values)];
                    case 2: return [4, Group.update({ id: values.id }, values)];
                    case 3: return [2, (_a.sent())[0]];
                }
            });
        });
    }
};
