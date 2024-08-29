"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stringsInArray = stringsInArray;
exports.someInArray = someInArray;
exports.extractFieldValues = extractFieldValues;
const isValue_1 = require("../utils/isValue");
/**
 * @notused
 */
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
function someInArray(check, array) {
    if (!(0, isValue_1.isValue)(check))
        return false;
    if (typeof check === 'string') {
        check = [check];
    }
    else if (!Array.isArray(check)) {
        return false;
    }
    return array.some((e) => check.includes(e));
}
function extractFieldValues(obj, fields, exclude = true, result = []) {
    if (typeof obj === 'object' && obj !== null) {
        for (let key in obj) {
            if (typeof obj[key] === 'object') {
                extractFieldValues(obj[key], fields, exclude, result);
            }
            else if (fields.includes(key) !== exclude) {
                if (Array.isArray(obj[key])) {
                    result.push(JSON.stringify(obj[key]));
                }
                else {
                    result.push(obj[key]);
                }
            }
        }
    }
    return result;
}
