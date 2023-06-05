"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * The abstract class of the Payment adapter. Used to create new payment system adapters.
 */
class PaymentAdapter {
    constructor(InitPaymentAdapter) {
        this.InitPaymentAdapter = InitPaymentAdapter;
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
