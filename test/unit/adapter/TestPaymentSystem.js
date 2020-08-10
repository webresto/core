"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const PaymentAdapter_1 = require("../../../adapter/payment/PaymentAdapter");
class TestPaymentSystem extends PaymentAdapter_1.default {
    async createPayment(payment, backLink) {
        return new Promise((resolve) => {
            let latency = Math.floor(Math.random() * 2400) + 600;
            setTimeout(() => {
                resolve({
                    redirectLink: "http://test.webresto.dev",
                    payment: payment,
                    error: null
                });
            }, latency);
        });
    }
    async checkPayment(payment) {
        let latency = Math.floor(Math.random() * 1200) + 1;
        const rand = Boolean(Math.round(Math.random()));
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    paid: rand,
                    payment: payment,
                    error: null
                });
            }, latency);
        });
    }
    static getInstance() {
        if (!TestPaymentSystem.instance) {
            TestPaymentSystem.instance = new TestPaymentSystem({
                title: "test",
                type: 'external',
                adapter: "test-payment-system"
            });
        }
        return TestPaymentSystem.instance;
    }
}
exports.default = TestPaymentSystem;
