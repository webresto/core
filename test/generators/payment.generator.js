"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const { v4: uuid } = require('uuid');
function generate_payment() {
    return {
        amount: Math.floor(Math.random() * 9999) + 1000,
        paymentId: uuid(),
        paymentMethod: "TestPaymentSystem",
        originModel: "Cart",
        comment: "testing"
    };
}
exports.default = generate_payment;
