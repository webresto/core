"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const ExternalTestPaymentSystem_1 = require("../external_payments/ExternalTestPaymentSystem");
var paymentMethodSeed = {
    title: 'Cash',
    type: 'promise',
    adapter: "not_adapter_cache2",
    order: 2,
    description: 'Pay by cash',
};
var cashMethod;
describe('PaymentMethod', function () {
    this.timeout(10000);
    it('getAdapter', async function () {
        cashMethod = await PaymentMethod.findOrCreate({ adapter: paymentMethodSeed.adapter }, paymentMethodSeed);
        // console.log(JSON.stringify(cashMethod, null, ' '));
        let result = await cashMethod.getAdapter();
        chai_1.expect(result).to.equal(undefined);
    });
    it('getAdapterById TODO', async function () {
        //static
        cashMethod = await PaymentMethod.findOrCreate({ adapter: paymentMethodSeed.adapter }, paymentMethodSeed);
        let result = await PaymentMethod.getAdapterById(cashMethod.id);
        // console.dir(result);
        chai_1.expect(result).to.equal(undefined);
    });
    it('isPaymentPromise', async function () {
        //static method
        cashMethod = await PaymentMethod.findOrCreate({ adapter: paymentMethodSeed.adapter }, paymentMethodSeed);
        let result1 = await PaymentMethod.isPaymentPromise(cashMethod.id);
        chai_1.expect(result1).to.equal(true);
        await ExternalTestPaymentSystem_1.default.getInstance(); // save adapter: 'test-payment-system'
        // await delay(1000);
        let externalPaymentMethod = await PaymentMethod.findOne({ adapter: 'test-payment-system' });
        let result2 = await PaymentMethod.isPaymentPromise(externalPaymentMethod.id);
        chai_1.expect(result2).to.equal(false);
    });
    it('alive TODO', async function () {
        //static
    });
    it('getAvailable TODO', async function () {
        //static
    });
    it('checkAvailable TODO', async function () {
        //static
    });
});
function delay(ms) {
    return new Promise((resolve, reject) => {
        setTimeout(resolve, ms);
    });
}
