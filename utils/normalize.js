"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizePercent = normalizePercent;
const decimal_js_1 = __importDefault(require("decimal.js"));
function normalizePercent(value) {
    let d = new decimal_js_1.default(value);
    // If greater than 1 — it means this is "30", not "0.3"
    if (d.greaterThan(1)) {
        d = d.div(100);
    }
    return d;
}
