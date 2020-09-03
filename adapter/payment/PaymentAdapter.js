"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Абстрактный класс Payment адаптера. Используется для создания новых адаптеров платежных систем.
 */
class PaymentAdapter {
    constructor(InitPaymentAdapter) {
        this.InitPaymentAdapter = InitPaymentAdapter;
        PaymentMethod.alive(this.InitPaymentAdapter);
    }
}
exports.default = PaymentAdapter;
