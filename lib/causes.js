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
exports.Weekdays = exports.checkDistance = exports.between = exports.checkTime = exports.addCause = exports.addCauseByFields = void 0;
var moment = require("moment");
var adapter_1 = require("../adapter");
var Point_1 = require("../adapter/map/Point");
var customCauses = [];
function causes(condition, cart) {
    return __awaiter(this, void 0, void 0, function () {
        var customCausesWithoutCart, _i, customCausesWithoutCart_1, cause, dishes, groups1, dishGroups, _a, _b, _c, i, groupId, group, _d, _e, _f, j, j_1, groups, customCausesWithCart, _g, customCausesWithCart_1, cause;
        return __generator(this, function (_h) {
            switch (_h.label) {
                case 0:
                    if (!condition.enable)
                        return [2, false];
                    if (!condition.causes)
                        return [2, true];
                    if (!checkTime(condition.causes.workTime))
                        return [2, false];
                    if (!condition.causes.directDistance) return [3, 2];
                    return [4, checkDistance(cart, condition.causes.directDistance)];
                case 1:
                    if (!(_h.sent()))
                        return [2, false];
                    _h.label = 2;
                case 2:
                    customCausesWithoutCart = customCauses.filter(function (c) { return !c.needCart; });
                    _i = 0, customCausesWithoutCart_1 = customCausesWithoutCart;
                    _h.label = 3;
                case 3:
                    if (!(_i < customCausesWithoutCart_1.length)) return [3, 6];
                    cause = customCausesWithoutCart_1[_i];
                    if (!condition.causes[cause.name]) return [3, 5];
                    return [4, cause.fn(condition)];
                case 4:
                    if (!(_h.sent()))
                        return [2, false];
                    _h.label = 5;
                case 5:
                    _i++;
                    return [3, 3];
                case 6:
                    if (!cart) return [3, 21];
                    return [4, Cart.count(cart)];
                case 7:
                    _h.sent();
                    if (condition.causes.cartAmount)
                        if (!between(condition.causes.cartAmount.valueFrom, condition.causes.cartAmount.valueTo, cart.cartTotal))
                            return [2, false];
                    if (condition.causes.dishes) {
                        dishes = cart.dishes.filter(function (d) { return condition.causes.dishes.includes(d.id); });
                        if (dishes.length === 0)
                            return [2, false];
                    }
                    if (!condition.causes.groups) return [3, 16];
                    groups1 = new Set();
                    dishGroups = cart.dishes.map(function (d) { return d.dish.parentGroup.id; });
                    _a = [];
                    for (_b in dishGroups)
                        _a.push(_b);
                    _c = 0;
                    _h.label = 8;
                case 8:
                    if (!(_c < _a.length)) return [3, 15];
                    i = _a[_c];
                    if (!dishGroups.hasOwnProperty(i)) return [3, 14];
                    groupId = dishGroups[i];
                    return [4, Group.find(groupId)];
                case 9:
                    group = _h.sent();
                    _d = [];
                    for (_e in group)
                        _d.push(_e);
                    _f = 0;
                    _h.label = 10;
                case 10:
                    if (!(_f < _d.length)) return [3, 14];
                    j = _d[_f];
                    if (!group.hasOwnProperty(j)) return [3, 13];
                    groups1.add(group[j].id);
                    _h.label = 11;
                case 11:
                    if (!group[j].parentGroup) return [3, 13];
                    return [4, Group.find(group[j].parentGroup)];
                case 12:
                    group = _h.sent();
                    for (j_1 in group) {
                        if (group.hasOwnProperty(j_1)) {
                            groups1.add(group[j_1].id);
                        }
                    }
                    return [3, 11];
                case 13:
                    _f++;
                    return [3, 10];
                case 14:
                    _c++;
                    return [3, 8];
                case 15:
                    groups = dishGroups.filter(function (g) { return condition.causes.groups.includes(g); });
                    if (groups.length === 0)
                        return [2, false];
                    _h.label = 16;
                case 16:
                    customCausesWithCart = customCauses.filter(function (c) { return c.needCart; });
                    _g = 0, customCausesWithCart_1 = customCausesWithCart;
                    _h.label = 17;
                case 17:
                    if (!(_g < customCausesWithCart_1.length)) return [3, 20];
                    cause = customCausesWithCart_1[_g];
                    if (!condition.causes[cause.name]) return [3, 19];
                    return [4, cause.fn(condition, cart)];
                case 18:
                    if (!(_h.sent()))
                        return [2, false];
                    _h.label = 19;
                case 19:
                    _g++;
                    return [3, 17];
                case 20: return [2, true];
                case 21: return [2, true];
            }
        });
    });
}
exports["default"] = causes;
function addCauseByFields(name, needCart, fn) {
    customCauses.push({ name: name, needCart: needCart, fn: fn });
}
exports.addCauseByFields = addCauseByFields;
function addCause(cause) {
    customCauses.push(cause);
}
exports.addCause = addCause;
function checkTime(timeArray) {
    if (!timeArray || !timeArray.length)
        return true;
    var date = moment();
    function checkHours(start, stop) {
        try {
            start = start.split(':');
        }
        catch (e) {
        }
        try {
            stop = stop.split(':');
        }
        catch (e) {
        }
        try {
            var sh = start ? parseInt(start[0]) : start;
            var sm = start ? parseInt(start[1]) : start;
            var eh = stop ? parseInt(stop[0]) : stop;
            var em = stop ? parseInt(stop[1]) : stop;
            var startTime = sh * 60 + sm;
            var endTime = eh * 60 + em;
            return startTime < endTime ? between(startTime, endTime, date.hours() * 60 + date.minutes())
                : startTime > endTime ? !between(endTime, startTime, date.hours() * 60 + date.minutes()) :
                    true;
        }
        catch (e) {
            return true;
        }
    }
    try {
        var all = timeArray.filter(function (t) { return t.dayOfWeek === 'all'; })[0];
        if (all) {
            return checkHours(all.start, all.end);
        }
        var today_1 = Weekdays[date.day()];
        var day = timeArray.filter(function (t) { return t.dayOfWeek.toLowerCase() === today_1 || t.daysOfWeek.map(function (d) { return d.toLowerCase(); }).includes(today_1); })[0];
        if (day) {
            return checkHours(day.start, day.end);
        }
        return timeArray.length === 0;
    }
    catch (e) {
        sails.log.error(e);
        return false;
    }
}
exports.checkTime = checkTime;
function between(from, to, a) {
    return ((!from && !to) || (!from && to >= a) || (!to && from < a) || (from < a && to >= a));
}
exports.between = between;
function checkDistance(cart, data) {
    return __awaiter(this, void 0, void 0, function () {
        var config, adapterGeo, geo, adapterDistance, distance;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!cart)
                        return [2, true];
                    if (!cart.address)
                        return [2, false];
                    return [4, SystemInfo.use('map')];
                case 1:
                    config = _a.sent();
                    adapterGeo = new (adapter_1.Map.getAdapter(config.geocode.toLowerCase()))(config);
                    return [4, adapterGeo.getGeocode(cart.address.street, cart.address.home)];
                case 2:
                    geo = _a.sent();
                    adapterDistance = new (adapter_1.Map.getAdapter(config.distance.toLowerCase()))(config);
                    distance = adapterDistance.getDistance(geo, new Point_1["default"](data.center[0], data.center[1]));
                    return [2, distance < data.to && distance > data.from];
            }
        });
    });
}
exports.checkDistance = checkDistance;
var Weekdays;
(function (Weekdays) {
    Weekdays[Weekdays["sunday"] = 0] = "sunday";
    Weekdays[Weekdays["monday"] = 1] = "monday";
    Weekdays[Weekdays["tuesday"] = 2] = "tuesday";
    Weekdays[Weekdays["wednesday"] = 3] = "wednesday";
    Weekdays[Weekdays["thursday"] = 4] = "thursday";
    Weekdays[Weekdays["friday"] = 5] = "friday";
    Weekdays[Weekdays["saturday"] = 6] = "saturday";
})(Weekdays = exports.Weekdays || (exports.Weekdays = {}));
