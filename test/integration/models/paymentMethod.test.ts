import { expect } from "chai";
import TestPaymentSystem from "../../unit/external_payments/ExternalTestPaymentSystem";
import { PaymentMethodRecord } from "../../../models/PaymentMethod";
var paymentMethodSeed: PaymentMethodRecord = {
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
  //     // not testable
  // })
  it("getAvailable TODO", async function () {
    //static
    // create an external PaymentMethod (enable: true / false) and a paymentpromise PaymentMethod (enable: true / false), check what getAvailable returns
    // check that it returns an array.
  });
  it("checkAvailable TODO", async function () {
    //static
    // use the payment methods prepared in advance and check that the method works
  });
});