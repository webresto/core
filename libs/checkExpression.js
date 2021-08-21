"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Check additionalInfo. Return empty string if success or reject reason string
 * @param obj
 * @return string
 */
function default_1(obj) {
    if (!obj) {
        return '';
    }
    try {
        if (obj.visible === false)
            return 'visible';
        if (obj.workTime) {
            if (!checkTime(obj.workTime)) {
                return 'time';
            }
        }
        if (obj.promo === true)
            return 'promo';
        if (obj.modifier === true)
            return 'modifier';
        return '';
    }
    catch (e) {
        return '';
    }
}
exports.default = default_1;
;
function checkTime(timeArray) {
    return true;
}
