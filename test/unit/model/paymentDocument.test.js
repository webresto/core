"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const getEmitter_1 = require("../../../lib/getEmitter");
const ExternalTestPaymentSystem_1 = require("../external_payments/ExternalTestPaymentSystem");
describe('PaymentDocument', function () {
    it('doPaid TODO', async function () {
        getEmitter_1.default().on('core-payment-document-paid', function () {
        });
    });
    it('doCheck TODO', async function () {
        getEmitter_1.default().on('core-payment-document-check', function () {
        });
        getEmitter_1.default().on('core-payment-document-checked-document', function () {
        });
    });
    it('register TODO', async function () {
        //static
        const result = await ExternalTestPaymentSystem_1.default.getInstance();
        // register( cart.id, 'cart', 1000, paymentMethodId: string,  'example.com', 'fail.com', 'test comment', 'data')
    });
    it('status TODO', async function () {
        //static
    });
    it('processor TODO', async function () {
        //static
    });
    it('afterUpdate(sails) TODO', async function () {
    });
});
