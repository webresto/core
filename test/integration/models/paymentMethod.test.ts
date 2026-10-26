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
  //     // не тестируемый
  // })
  it("getAvailable TODO", async function () {
    //static
    // создать external PaymentMethod (enable: true / false) & paymentpromise PaymentMethod (enable: true / false), проверить результат работы метода getAvailable
    // проверить что возвращает массив.
  });
  it("creates a no-adapter method without adapter", async function () {
    const first = await PaymentMethod.create({ title: "Terminal", type: "promise", enable: true }).fetch();
    const second = await PaymentMethod.create({ title: "Card on delivery", type: "promise", adapter: "", enable: true }).fetch();
    expect(first.adapter).to.equal(`no-adapter-${first.id}`);
    expect(second.adapter).to.equal(`no-adapter-${second.id}`);
    expect(await PaymentMethod.checkAvailable(first.id)).to.equal(true);
  });
  it("requires adapter for adapter types", async function () {
    let error = null;
    try {
      await PaymentMethod.create({ title: "Gateway", type: "external", enable: true }).fetch();
    } catch (e) {
      error = e;
    }
    expect(error).to.not.equal(null);
  });
  it("keeps adapter when update sends an empty one", async function () {
    const method = await PaymentMethod.create({ title: "Keep", type: "promise", adapter: "keep-adapter", enable: true }).fetch();
    const updated = await PaymentMethod.updateOne({ id: method.id }).set({ adapter: "", title: "Kept" }) as unknown as PaymentMethodRecord;
    expect(updated.adapter).to.equal("keep-adapter");
    expect(updated.title).to.equal("Kept");
  });
  it("checkAvailable TODO", async function () {
    //static
    // использовать заранее созданные платежные методы, проверить работоспособность метода
  });
});