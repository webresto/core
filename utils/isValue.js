"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValue = void 0;
function isValue(value) {
    // Check for undefined and null
    if (value === undefined || value === null) {
        return false;
    }
    // Check for NaN (only if the value is of type number)
    if (typeof value === 'number' && Number.isNaN(value)) {
        return false;
    }
    // Check for empty strings
    if (typeof value === 'string' && value.trim() === '') {
        return false;
    }
    // Check for empty arrays
    if (Array.isArray(value) && value.length === 0) {
        return false;
    }
    // Check for empty objects
    if (typeof value === 'object' && Object.keys(value).length === 0) {
        return false;
    }
    return true;
}
exports.isValue = isValue;
