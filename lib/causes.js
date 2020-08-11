"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const moment = require("moment");
const adapter_1 = require("../adapter");
const Point_1 = require("../adapter/map/Point");
const customCauses = [];
/**
 * Check some condition from some cart
 * @param {string} condition - condition for check
 * @param {object} cart - cart for check
 * @returns {Promise<boolean>}
 */
async function causes(condition, cart) {
    if (!condition.enable)
        return false;
    if (!condition.causes)
        return true;
    if (!checkTime(condition.causes.workTime))
        return false;
    if (condition.causes.directDistance)
        if (!await checkDistance(cart, condition.causes.directDistance))
            return false;
    const customCausesWithoutCart = customCauses.filter(c => !c.needCart);
    for (let cause of customCausesWithoutCart) {
        if (condition.causes[cause.name]) {
            if (!await cause.fn(condition))
                return false;
        }
    }
    if (cart) {
        await Cart.count(cart);
        if (condition.causes.cartAmount)
            if (!between(condition.causes.cartAmount.valueFrom, condition.causes.cartAmount.valueTo, cart.cartTotal))
                return false;
        if (condition.causes.dishes) {
            const dishes = cart.dishes.filter(d => condition.causes.dishes.includes(d.id));
            if (dishes.length === 0)
                return false;
        }
        if (condition.causes.groups) {
            const groups1 = new Set();
            const dishGroups = cart.dishes.map(d => d.dish.parentGroup.id);
            for (let i in dishGroups) {
                if (dishGroups.hasOwnProperty(i)) {
                    let groupId = dishGroups[i];
                    let group = await Group.find(groupId);
                    for (let j in group) {
                        if (group.hasOwnProperty(j)) {
                            groups1.add(group[j].id);
                            while (group[j].parentGroup) {
                                group = await Group.find(group[j].parentGroup);
                                for (let j in group) {
                                    if (group.hasOwnProperty(j)) {
                                        groups1.add(group[j].id);
                                    }
                                }
                            }
                        }
                    }
                }
            }
            const groups = dishGroups.filter(g => condition.causes.groups.includes(g));
            if (groups.length === 0)
                return false;
        }
        const customCausesWithCart = customCauses.filter(c => c.needCart);
        for (let cause of customCausesWithCart) {
            if (condition.causes[cause.name]) {
                if (!await cause.fn(condition, cart))
                    return false;
            }
        }
        return true;
    }
    else {
        return true;
    }
}
exports.default = causes;
/**
 * Add new cause in custom causes
 * @param name - cause name
 * @param needCart - if true in fn will be cart as second param
 * @param fn - call back to check cause in condition and cart
 */
function addCauseByFields(name, needCart, fn) {
    customCauses.push({ name, needCart, fn });
}
exports.addCauseByFields = addCauseByFields;
/**
 * Add new cause in custom causes
 * @param cause - new cause object
 */
function addCause(cause) {
    customCauses.push(cause);
}
exports.addCause = addCause;
/**
 * Check that current time is in time of paras
 * @param {array} timeArray
 * @example
 * timeArray: [
 *  {
 *    dayOfWeek: 'monday',
 *    start: '8:00',
 *    end: '18:00'
 *  },
 *  {...}
 * ]
 * @returns {boolean}
 */
function checkTime(timeArray) {
    if (!timeArray || !timeArray.length)
        return true;
    const date = moment();
    // sails.log.info(date);
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
            const sh = start ? parseInt(start[0]) : start;
            const sm = start ? parseInt(start[1]) : start;
            const eh = stop ? parseInt(stop[0]) : stop;
            const em = stop ? parseInt(stop[1]) : stop;
            const startTime = sh * 60 + sm;
            const endTime = eh * 60 + em;
            return startTime < endTime ? between(startTime, endTime, date.hours() * 60 + date.minutes())
                : startTime > endTime ? !between(endTime, startTime, date.hours() * 60 + date.minutes()) :
                    true;
        }
        catch (e) {
            return true;
        }
    }
    try {
        const all = timeArray.filter(t => t.dayOfWeek === 'all')[0];
        if (all) {
            return checkHours(all.start, all.end);
        }
        const today = Weekdays[date.day()];
        const day = timeArray.filter(t => t.dayOfWeek.toLowerCase() === today || t.daysOfWeek.map(d => d.toLowerCase()).includes(today))[0];
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
/**
 * Check that in (a,b,c) c is between a and b
 * @param {number} [from] is a
 * @param {number} [to] is b
 * @param {number} [a] is c
 * @returns {boolean}
 */
function between(from, to, a) {
    return ((!from && !to) || (!from && to >= a) || (!to && from < a) || (from < a && to >= a));
}
exports.between = between;
/**
 * Check distance between cart address and data DirectDistance info
 * @param cart
 * @param data
 */
async function checkDistance(cart, data) {
    if (!cart)
        return true;
    if (!cart.address)
        return false;
    const config = await SystemInfo.use('map');
    const adapterGeo = new (adapter_1.Map.getAdapter(config.geocode.toLowerCase()))(config);
    const geo = await adapterGeo.getGeocode(cart.address.street, cart.address.home);
    const adapterDistance = new (adapter_1.Map.getAdapter(config.distance.toLowerCase()))(config);
    const distance = adapterDistance.getDistance(geo, new Point_1.default(data.center[0], data.center[1]));
    return distance < data.to && distance > data.from;
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
