"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ExternalTestPaymentSystem_1 = require("./ExternalTestPaymentSystem");
const payment_generator_1 = require("../../generators/payment.generator");
const chai_1 = require("chai");
describe('TestPaymentSystem & PaymentAdapter basic testing', function () {
    this.timeout(31000);
    var test_payment = payment_generator_1.default();
    it('Payment regtest', async () => {
        const result = await ExternalTestPaymentSystem_1.default.getInstance();
        chai_1.expect(result['InitPaymentAdapter'].adapter).to.equal("test-payment-system");
    });
    it('Create payment test', async () => {
        const result = await ExternalTestPaymentSystem_1.default.getInstance().createPayment(test_payment, "http://back_url.com", "delay_3_sec");
        chai_1.expect(result.redirectLink).to.equal("http://redirect_link.com");
    });
    it('Testigt, not yet payment check', async () => {
        const result = await ExternalTestPaymentSystem_1.default.getInstance().checkPayment(test_payment);
        chai_1.expect(result.paid).to.equal(false);
    });
    it('Check done payment', async () => {
        setTimeout(async () => {
            const result = await ExternalTestPaymentSystem_1.default.getInstance().checkPayment(test_payment);
            chai_1.expect(result.paid).to.equal(true);
        }, 3000);
    });
    it('Exit on timeout', async () => {
    });
});