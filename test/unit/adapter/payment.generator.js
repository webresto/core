"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuid = require('uuid/v4');
function generate_payment() {
    return {
        total: Math.floor(Math.random() * 9999) + 1000,
        id: uuid(),
        isCorePayment: true,
        originModel: "Cart",
        data: "testing",
        comment: "testing"
    };
}
exports.default = generate_payment;
