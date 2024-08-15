"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isCustomData = isCustomData;
function isCustomData(value) {
    return typeof value === "object" && !Array.isArray(value) && value !== null;
}
