"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class PaymentAdapter {
    constructor(InitPaymentAdapter) {
        this.InitPaymentAdapter = InitPaymentAdapter;
        PaymentMethod.alive(this.InitPaymentAdapter);
    }
    static getInstance(...params) { return PaymentAdapter.prototype; }
    ;
}
exports.default = PaymentAdapter;
