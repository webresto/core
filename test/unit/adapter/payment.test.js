"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const TestPaymentSystem_1 = require("./TestPaymentSystem");
const payment_generator_1 = require("./payment.generator");
//let Sails: Sails = global.sails
describe('PaymentAdapter testing', function () {
    it('should save without error', async function (done) {
        let payment = payment_generator_1.default();
        const result = await TestPaymentSystem_1.default.getInstance().createPayment(payment, "test");
        console.log(result);
        done();
    });
});
/**
 * 1. тест создания платежа
 * 2. тест регистрации платжной систеиы
 * 3. тест оплаты с задерждой 3 секунды
 * 4. получение  ссылки для редиректа от платежной системы
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
