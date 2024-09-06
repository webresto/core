"use strict";
/**
 * // TODO: Abandoned because we have gone to global changes from Dish to Item
 */
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Check additionalInfo. Return empty string if success or reject reason string
 * @param obj
 * @return string
 */
function default_1(obj) {
    if (!obj) {
        return "";
    }
    try {
        if (obj.visible !== undefined && obj.visible === false)
            return "visible";
        if (obj.worktime) {
            if (!checkTime(obj.worktime)) {
                return "time";
            }
        }
        if (obj.promo && obj.promo === true)
            return "promo";
        if (obj.modifier && obj.modifier === true)
            return "modifier";
        return "";
    }
    catch (e) {
        return "";
    }
}
exports.default = default_1;
function checkTime(timeArray) {
    return true;
}
