"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = generate_payment;
const { v4: uuid } = require("uuid");
function generate_payment() {
    return {
        id: uuid(),
        amount: Math.floor(Math.random() * 9999) + 1000,
        originModelId: uuid(),
        paymentMethod: "TestPaymentSystem",
        originModel: "Order",
        comment: "testing",
    };
}
