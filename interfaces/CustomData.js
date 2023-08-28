"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isCustomData = void 0;
function isCustomData(value) {
    return typeof value === "object" && !Array.isArray(value) && value !== null;
}
exports.isCustomData = isCustomData;
