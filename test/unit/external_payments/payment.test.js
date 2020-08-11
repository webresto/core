"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const TestPaymentSystem_1 = require("./TestPaymentSystem");
const payment_generator_1 = require("./payment.generator");
const chai_1 = require("chai");
describe('PaymentAdapter testing', function () {
    /**
     * 1. Тест регистрации платежной системы
     */
    it('Payment regtest.', async () => {
        const result = await TestPaymentSystem_1.default.getInstance();
        chai_1.expect(result['InitPaymentAdapter'].adapter).to.equal("test-payment-system");
    });
    /**
    * 2. тест создания платежа
    */
    it('Create payment test.', async () => {
        let payment = payment_generator_1.default();
        const result = await TestPaymentSystem_1.default.getInstance().createPayment(payment, "test");
        chai_1.expect(result.redirectLink).to.equal("http://test.webresto.dev");
    });
    /**
  * 2. тест создания платежа
  */
    it('Exit on timeout', async () => {
        // тут нужно тестировать корзину там где вызывается создание платежа
    });
    /**
    * 6. переход стейта и получение заказа
    */
    it('Exit on timeout', async () => {
        // тут нужно тестировать корзину там где вызывается создание платежа
    });
});
/**
 *
 * 5. одновременная оплата  с разными задержками
 * 6. переход стейта и получение заказа
 * 7. проверка заказа который уже проверен
 * 8. Оплата заказа который уже оплачен
 * 9. Наличка, доставка заказа
 * 10. Разные параметры для заказа на чеке и на оредере
 * 11. Отмена оплаты внешней системой и оплата наличкой
 * 12. Тиканье из базы, по времени активности
 * 13. Тиканье пользователем
 * 14. проверка afterUpdate
 * 15. Тест ошибки
 * 16. тест проброса данных в Адаптер и из него
 * 17. Тест запуска без конфига
 * 18. заказ без выбора платежной системы
 * 19.
 *
 */ 
