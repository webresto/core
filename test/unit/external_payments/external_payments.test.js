"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ExternalTestPaymentSystem_1 = __importDefault(require("./ExternalTestPaymentSystem"));
const payment_generator_1 = __importDefault(require("../../generators/payment.generator"));
const chai_1 = require("chai");
// todo: fix types model instance to {%ModelName%}Record for PaymentDocument";
var paymentDocument;
describe("TestPaymentSystem & PaymentAdapter basic testing", function () {
    this.timeout(31000);
    var test_payment = (0, payment_generator_1.default)();
    /**
     * 1. Тест регистрации платежной системы
     */
    it("PaymentSystem registration", async () => {
        const result = await ExternalTestPaymentSystem_1.default.getInstance();
        (0, chai_1.expect)(result["InitPaymentAdapter"].adapter).to.equal("test-payment-system");
    });
    /**
     * 2. тест создания платежа
     */
    it("Create payment test", async () => {
        const result = await ExternalTestPaymentSystem_1.default.getInstance().createPayment(test_payment, "http://back_url.com", "http://back_url.com", "delay_3_sec");
        paymentDocument = result;
        (0, chai_1.expect)(result.redirectLink).to.equal("http://redirect_link.com");
    });
    /**
     * 3. Проверка оплаты (преждевременная)
     */
    it("Testing, not yet payment check", async () => {
        const result = await ExternalTestPaymentSystem_1.default.getInstance().checkPayment(paymentDocument);
        (0, chai_1.expect)(result.paid).to.equal(false);
    });
    /**
     * 4. Проверка оплаты (уже оплачено)
     */
    it("Check done payment", async () => {
        setTimeout(async () => {
            const result = await ExternalTestPaymentSystem_1.default.getInstance().checkPayment(paymentDocument);
            (0, chai_1.expect)(result.paid).to.equal(true);
        }, 3000);
    });
    // /**
    // * 4. Одновременная оплата  с разными задержками
    // */
    // it('Several payments in one time', async () => {
    //
    //   // тут нужно тестировать корзину там где вызывается создание платежа
    //   const params = ['delay_15', 'delay_5', 'delay_1', 'delay_3']
    //   params.forEach(param => {
    //     let payment: Payment = generate_payment();
    //     TestPaymentSystem.getInstance().createPayment(payment , "test", param);
    //   });
    //   const result = await TestPaymentSystem.getInstance().createPayment(payment , "test");
    //   expect(result.redirectLink).to.equal("http://test.webresto.dev");
    // });
    /**
     *
     */
});
