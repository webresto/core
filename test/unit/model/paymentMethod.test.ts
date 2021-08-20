import { expect } from "chai";
import TestPaymentSystem from '../external_payments/ExternalTestPaymentSystem';


var paymentMethodSeed =
    {
      title: 'Cash',
      type: 'promise',
      adapter: "not_adapter_cache2",
      order: 2,
      description: 'Pay by cash',
    }
var cashMethod; 


describe('PaymentMethod', function(){
    this.timeout(10000);

    it('getAdapter', async function(){
        // test paymentpromise PaymentMethod       
        cashMethod = await PaymentMethod.findOrCreate({adapter: paymentMethodSeed.adapter}, paymentMethodSeed);
        let result = await cashMethod.getAdapter();
        expect(result).to.equal(undefined);

        // TODO: check external PaymentMethod 
    })
    it('getAdapterById TODO', async function(){
        //static
        cashMethod = await PaymentMethod.findOrCreate({adapter: paymentMethodSeed.adapter}, paymentMethodSeed);
        let result = await PaymentMethod.getAdapterById(cashMethod.id);
        expect(result).to.equal(undefined);

        // TODO: check external PaymentMethod 
    })
    it('isPaymentPromise', async function(){
        //static method
        // 
        cashMethod = await PaymentMethod.findOrCreate({adapter: paymentMethodSeed.adapter}, paymentMethodSeed);
        let result1 = await PaymentMethod.isPaymentPromise(cashMethod.id);
        expect(result1).to.equal(true);

        // external PaymentMethod
        TestPaymentSystem.getInstance(); // save adapter: 'test-payment-system'
        let externalPaymentMethod = await PaymentMethod.findOne({adapter: 'test-payment-system'});
        let result2 = await PaymentMethod.isPaymentPromise(externalPaymentMethod.id);
        expect(result2).to.equal(false);
    })
    // it('alive', async function(){
    //     // не тестируемый
    // })
    it('getAvailable TODO', async function(){
        //static
        // создать external PaymentMethod (enable: true / false) & paymentpromise PaymentMethod (enable: true / false), проверить результат работы метода getAvailable
        // проверить что возвращает массив. 
    })
    it('checkAvailable TODO', async function(){
        //static
        // использовать заранее созданные платежные методы, проверить работоспособность метода
    })
})


function delay(ms){
    return new Promise((resolve, reject) => {
        setTimeout(resolve, ms)
    });
}