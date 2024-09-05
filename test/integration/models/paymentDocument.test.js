"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const ExternalTestPaymentSystem_1 = __importDefault(require("../../unit/external_payments/ExternalTestPaymentSystem"));
const PaymentDocument_1 = __importDefault(require("../../../models/PaymentDocument"));
//import Order from '../../../models/Order';
describe("PaymentDocument", function () {
    this.timeout(31000);
    let paymentMethod;
    /**
     *
     */
    before(async function () {
        let testPaymentSystem = ExternalTestPaymentSystem_1.default.getInstance();
        await testPaymentSystem.wait();
        paymentMethod = await PaymentMethod.findOne({
            adapter: "test-payment-system",
        });
        await PaymentMethod.update({ id: paymentMethod.id }, { enable: true }).fetch();
        // TODO:
        // Проверка суммы. Проверка originModel. Проверка платежного метода. Проверить paymentResponse, сравнить.
    });
    it("doPaid TODO", async function () {
        emitter.on("core:payment-document-paid", "test", function (pd) { });
        // создать документ с status = "PAID" и paid !== true . Проверить сохраниение документа, проверить вызов эмита
    });
    it("doCheck TODO", async function () {
        emitter.on("core:payment-document-check", "test", function () { });
        emitter.on("core:payment-document-checked-document", "test", function () { });
        // создать платежный документ для тестировочной платежной системы. Провести оплату в тестовой платежной системе. Выполнить doCheck. Проверить результат всех вариантов событий (не проведенная оплата, проведенная оплата)
    });
    it("afterUpdate(sails) TODO", async function () {
        // Создать корзину. В корзине выбрать платежный метод (тестовая система). Поставить оплату и проверить что в корзине status === 'PAID'
    });
    //   it("register payment document", async function () {
    //  });
    it("check payment processor", async function () {
        /**
         * In order to test the payment document, we create two payments. And subscribe to
         * doCheck() event; if we receive these two payments through an event, then the payment processor calls them.
         */
        let count = [];
        emitter.on("core:payment-document-check", "test", function (paymentDocument) {
            count.push(paymentDocument);
        });
        await PaymentDocument_1.default.destroy({});
        let order = await Order.create({}).fetch();
        if (!paymentMethod)
            throw "paymentMethod (test-payment-system) was not found ";
        PaymentDocument_1.default.processor(3000);
        await PaymentDocument_1.default.register(order.id, "order", 100, paymentMethod.id, "http://", "http://", "test-payment-processor", { test: true });
        await sleep(5000);
        // // back to 120 sec payment processor
        PaymentDocument_1.default.processor(120000);
        (0, chai_1.expect)(count.length).to.equal(1);
    });
});
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
