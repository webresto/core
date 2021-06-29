

import TestPaymentSystem from './ExternalTestPaymentSystem'
import { Payment }  from "../../../modelsHelp/Payment"
import generate_payment from '../../generators/payment.generator'
import { expect } from 'chai';
import PaymentDocument from '../../../models/PaymentDocument';

var paymentDocument: PaymentDocument;

describe('TestPaymentSystem & PaymentAdapter basic testing', function () {
  this.timeout(31000);
  var test_payment: Payment = generate_payment();

  /**
   * 1. Тест регистрации платежной системы
   */
  it('PaymentSystem registration', async () => { 
    const result = await TestPaymentSystem.getInstance();
    expect(result['InitPaymentAdapter'].adapter).to.equal("test-payment-system");
  });  

  /**
  * 2. тест создания платежа
  */

  it('Create payment test', async () => { 
    const result = await TestPaymentSystem.getInstance().createPayment(test_payment , "http://back_url.com", "http://back_url.com", "delay_3_sec");
    paymentDocument = result as PaymentDocument;
    expect(result.redirectLink).to.equal("http://redirect_link.com");
  });

  /**
  * 3. Проверка оплаты (преждевременная)
  */
  it('Testigt, not yet payment check', async () => { 
    const result = await TestPaymentSystem.getInstance().checkPayment(paymentDocument);
    expect(result.paid).to.equal(false);
  });

  /**
  * 4. Проверка оплаты (уже оплачено)
  */
  it('Check done payment', async () => { 
    setTimeout(async () => {
      const result = await TestPaymentSystem.getInstance().checkPayment(paymentDocument);
      expect(result.paid).to.equal(true);
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