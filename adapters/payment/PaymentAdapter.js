"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class PaymentAdapter {
    constructor(InitPaymentAdapter) {
        this.InitPaymentAdapter = InitPaymentAdapter;
        this.config = InitPaymentAdapter.config;
        this.initializationPromise = this.initialize();
    }
    /**
     * Waiting for initialization
     */
    async wait() {
        await this.initializationPromise;
    }
    async initialize() {
        await PaymentMethod.alive(this);
    }
    /**
     * Method for creating and obtaining an existing Payment Adapter
     * Since there can be a lot of adapters, this is a direct way to obtain an adapter from his class
     * @deprecated
     * @param init
     */
    static getInstance(init) {
        return PaymentAdapter.prototype;
    }
}
exports.default = PaymentAdapter;
