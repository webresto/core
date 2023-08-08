"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stringsInArray = void 0;
function stringsInArray(check, array) {
    if (typeof check === 'string') {
        check = [check];
    }
    return array.some((e) => check.includes(e));
}
exports.stringsInArray = stringsInArray;
