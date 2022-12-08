import { expect } from "chai";
import { PaymentMethodType } from "../../../models/PaymentMethod";
import TestPaymentSystem from "../../unit/external_payments/ExternalTestPaymentSystem";

var paymentMethodSeed = {
  id: "test-payment-cash",
  title: "Cash",
  type: PaymentMethodType.PROMISE,
  adapter: "not_adapter_cache",
  order: 2,
  description: "Pay by cash",
  enable: true
};
var cashMethod;

describe("PaymentMethod", function () {
  this.timeout(10000);

  it("getAdapter", async function () {
    // test paymentpromise PaymentMethod
    cashMethod = await PaymentMethod.findOrCreate({ adapter: paymentMethodSeed.adapter }, paymentMethodSeed);
    console.log(cashMethod)
    let result = await PaymentMethod.getAdapter(cashMethod.adapter);
    expect(result).be.undefined;

    // TODO: check external PaymentMethod
  });
  it("getAdapterById", async function () {
    //static
    cashMethod = await PaymentMethod.findOrCreate({ adapter: paymentMethodSeed.adapter }, paymentMethodSeed);
    
    let error = null;
    try {
      await PaymentMethod.getAdapterById(cashMethod.id);
    } catch (e) {
      error = e;
    }
    
    expect(error).to.not.equal(null);
    
    // TODO: check external PaymentMethod
  });
  it("isPaymentPromise", async function () {
    //static method
    //
    cashMethod = await PaymentMethod.findOrCreate({ adapter: paymentMethodSeed.adapter }, paymentMethodSeed);
    let result1 = await PaymentMethod.isPaymentPromise(cashMethod.id);
    expect(result1).to.equal(true);

    // external PaymentMethod
    TestPaymentSystem.getInstance(); // save adapter: 'test-payment-system'
    let externalPaymentMethod = await PaymentMethod.findOne({
      adapter: "test-payment-system",
    });
    let result2 = await PaymentMethod.isPaymentPromise(externalPaymentMethod.id);
    expect(result2).to.equal(false);
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

function delay(ms) {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, ms);
  });
}
