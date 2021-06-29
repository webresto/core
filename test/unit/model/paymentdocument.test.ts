

import { expect } from 'chai';
import { Payment }  from "../../../modelsHelp/Payment"
import TestPaymentSystem from '../external_payments/ExternalTestPaymentSystem'
import generate_payment from '../../generators/payment.generator'
import PaymentDocument from '../../../models/PaymentDocument';
//import Cart from '../../../models/Cart';
import getEmitter from "../../../lib/getEmitter";
import { create } from 'lodash';

var paymentDocument: PaymentDocument;

describe('PaymentDocument', function(){
  this.timeout(31000);
  var test_payment: Payment = generate_payment();

  it('check payment processor', async function(){
      /**
       * Для того чтобы протестировать платежный документ мы создаем два платежа. И подписываемся на 
       * событие doCheck(); если мы получаем эти два платежа через евент, то процессор платежей их вызывает.
       */
      
      let count = [];
      getEmitter().on('core-payment-document-check', function(paymentDocument){
        count.push(paymentDocument.id);        
      });
      

      let cart = await Cart.create({});
      let paymentMethod = await PaymentMethod.findOne({adapter: "test-payment-system"}); 
      await PaymentDocument.register(cart.id, "cart", 100, paymentMethod.id, "http://", "http://", "test-payment-processor", {test: true})
      PaymentDocument.processor(3000);

      await sleep(5000)

      // back to 120 sec payment processor
      PaymentDocument.processor(120000);
      
      expect(count.length).to.equal(1);
    });
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
