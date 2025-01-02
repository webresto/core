"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const ExternalTestPaymentSystem_1 = __importDefault(require("../../unit/external_payments/ExternalTestPaymentSystem"));
var paymentMethodSeed = {
    id: "test-payment-cash",
    title: "Cash",
    type: "promise",
    adapter: "not_adapter_cache",
    sortOrder: 2,
    description: "Pay by cash",
    enable: true
};
var cashMethod;
describe("PaymentMethod", function () {
    this.timeout(10000);
    it("getAdapter", async function () {
        // test paymentpromise PaymentMethod
        cashMethod = await PaymentMethod.findOrCreate({ adapter: paymentMethodSeed.adapter }, paymentMethodSeed);
        let result = await PaymentMethod.getAdapter(cashMethod.adapter);
        (0, chai_1.expect)(result).be.undefined;
        // TODO: check external PaymentMethod
    });
    it("getAdapterById", async function () {
        //static
        cashMethod = await PaymentMethod.findOrCreate({ adapter: paymentMethodSeed.adapter }, paymentMethodSeed);
        let error = null;
        try {
            await PaymentMethod.getAdapterById(cashMethod.id);
        }
        catch (e) {
            error = e;
        }
        (0, chai_1.expect)(error).to.not.equal(null);
        // TODO: check external PaymentMethod
    });
    it("isPaymentPromise", async function () {
        //static method
        //
        cashMethod = await PaymentMethod.findOrCreate({ adapter: paymentMethodSeed.adapter }, paymentMethodSeed);
        let result1 = await PaymentMethod.isPaymentPromise(cashMethod.id);
        (0, chai_1.expect)(result1).to.equal(true);
        // external PaymentMethod
        ExternalTestPaymentSystem_1.default.getInstance(); // save adapter: 'test-payment-system'
        let externalPaymentMethod = await PaymentMethod.findOne({
            adapter: "test-payment-system",
        });
        let result2 = await PaymentMethod.isPaymentPromise(externalPaymentMethod.id);
        (0, chai_1.expect)(result2).to.equal(false);
    });
    // it('alive', async function(){
    //     // не тестируемый
    // })
    it("getAvailable TODO", async function () {
        //static
        // создать external PaymentMethod (enable: true / false) & paymentpromise PaymentMethod (enable: true / false), проверить результат работы метода getAvailable
        // проверить что возвращает массив.
    });
    it("checkAvailable TODO", async function () {
        //static
        // использовать заранее созданные платежные методы, проверить работоспособность метода
    });
});
