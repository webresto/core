"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const PaymentAdapter_1 = __importDefault(require("../../../adapters/payment/PaymentAdapter"));
var database = {};
class TestPaymentSystem extends PaymentAdapter_1.default {
    cancelPayment(paymentDocument) {
        throw new Error("Method not implemented.");
    }
    async createPayment(payment, backLinkSuccess, backLinkFail, testing) {
        let paid_latency;
        switch (testing) {
            case "delay_1_sec":
                paid_latency = 1000;
                break;
            case "delay_3_sec":
                paid_latency = 3000;
                break;
            case "delay_5_sec":
                paid_latency = 5000;
                break;
            case "delay_15_sec":
                paid_latency = 15000;
                break;
            case "delay_30_sec":
                paid_latency = 30000;
                break;
            case "delay_60_sec":
                paid_latency = 60000;
                break;
            default:
                paid_latency = 500;
                break;
        }
        // Imitation http latency of external system 
        let latency = Math.floor(Math.random() * 1000) + 600;
        let response;
        response = payment;
        response.error = null;
        response.paid = false;
        response.redirectLink = "http://redirect_link.com";
        return new Promise((resolve) => {
            setTimeout(() => {
                database[payment.originModelId] = payment;
                this.paid(payment, paid_latency);
                resolve(response);
            }, latency);
        });
    }
    async checkPayment(payment) {
        let latency = Math.floor(Math.random() * 500) + 1;
        return new Promise((resolve) => {
            setTimeout(() => {
                let response = database[payment.originModelId];
                resolve(response);
            }, latency);
        });
    }
    static getInstance() {
        if (!TestPaymentSystem.instance) {
            TestPaymentSystem.instance = new TestPaymentSystem({
                title: "test",
                type: "external",
                adapter: "test-payment-system",
            });
        }
        return TestPaymentSystem.instance;
    }
    paid(payment, latency) {
        setTimeout(() => {
            database[payment.originModelId].status = "PAID";
        }, latency);
        return;
    }
}
exports.default = TestPaymentSystem;
