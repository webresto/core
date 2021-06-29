"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const payment_generator_1 = require("../../generators/payment.generator");
//import Cart from '../../../models/Cart';
const getEmitter_1 = require("../../../lib/getEmitter");
var paymentDocument;
describe('PaymentDocument', function () {
    this.timeout(31000);
    var test_payment = payment_generator_1.default();
    it('check payment processor', async function () {
        /**
         * Для того чтобы протестировать платежный документ мы создаем два платежа. И подписываемся на
         * событие doCheck(); если мы получаем эти два платежа через евент, то процессор платежей их вызывает.
         */
        let count = [];
        getEmitter_1.default().on('core-payment-document-check', function (paymentDocument) {
            count.push(paymentDocument.id);
        });
        let cart = await Cart.create({});
        let paymentMethod = await PaymentMethod.findOne({ adapter: "test-payment-system" });
        await PaymentDocument.register(cart.id, "cart", 100, paymentMethod.id, "http://", "http://", "test-payment-processor", { test: true });
        PaymentDocument.processor(3000);
        await sleep(5000);
        // back to 120 sec payment processor
        PaymentDocument.processor(120000);
        chai_1.expect(count.length).to.equal(1);
    });
});
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
