"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuid = require('uuid/v4');
function generate_payment() {
    return {
        amount: Math.floor(Math.random() * 9999) + 1000,
        paymentId: uuid(),
        PaymentMethod: "TestPaymentSystem",
        originModel: "Cart",
        comment: "testing"
    };
}
exports.default = generate_payment;
