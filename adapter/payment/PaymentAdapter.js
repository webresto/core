"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Абстрактный класс Payment адаптера. Используется для создания новых адаптеров платежных систем.
 */
/**
 *
 *
 */
class PaymentAdapter {
    constructor(paymentMethod) {
        paymentMethod.type = 'external'; // указывает на то что платежный адапетр явдяется внешним
        PaymentMethod.alive(paymentMethod);
    }
    /**
     * Метод для создания и получения уже существующего Payment адаптера
     * @param params - параметры для инициализации
     */
    static getInstance(...params) { return PaymentAdapter.prototype; }
    ;
}
exports.default = PaymentAdapter;
