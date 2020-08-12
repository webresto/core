"use strict";
exports.__esModule = true;
var uuid = require('uuid/v4');
function generate_payment() {
    return {
        total: Math.floor(Math.random() * 9999) + 1000,
        id: uuid(),
        isCartPayment: true,
        paymentAdapter: "TestPaymentSystem",
        originModel: "Cart",
        data: "testing",
        comment: "testing"
    };
}
exports["default"] = generate_payment;
