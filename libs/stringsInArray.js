"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stringsInArray = void 0;
function stringsInArray(check, array) {
    // If check is an array of strings
    if (Array.isArray(check)) {
        // Check each string in the check array
        for (const str of check) {
            // If any of the strings is not present in the array array, return false
            if (!array.includes(str)) {
                return false;
            }
        }
        // If all strings in the check array are present in the array array, return true
        return true;
    }
    // If check is a string
    else {
        // Check if the check string is present in the array array
        return array.includes(check);
    }
}
exports.stringsInArray = stringsInArray;
