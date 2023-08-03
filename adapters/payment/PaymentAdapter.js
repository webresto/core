"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class PaymentAdapter {
    constructor(InitPaymentAdapter) {
        this.InitPaymentAdapter = InitPaymentAdapter;
        this.config = InitPaymentAdapter.config;
        PaymentMethod.alive(this);
    }
    /**
     * Метод для создания и получения уже существующего Payment adapterа
     * @param params - параметры для инициализации
     */
    static getInstance(...params) {
        return PaymentAdapter.prototype;
    }
}
exports.default = PaymentAdapter;
