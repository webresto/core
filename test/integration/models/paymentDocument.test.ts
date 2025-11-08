import { expect } from "chai";
import TestPaymentSystem from "../../unit/external_payments/ExternalTestPaymentSystem";
import { Payment } from "../../../interfaces/Payment";
import generate_payment from "../../generators/payment.generator";
import { PaymentMethodRecord } from "../../../models/PaymentMethod";
// todo: fix types model instance to {%ModelName%}Record for PaymentDocument";
//// todo: fix types model instance to {%ModelName%}Record for Order';

describe("PaymentDocument", function () {
  this.timeout(31000);
  let paymentMethod: PaymentMethodRecord;
  /**
   * 
   */
  before(async function () {
    let testPaymentSystem = TestPaymentSystem.getInstance();
    await testPaymentSystem.wait();

    paymentMethod = await PaymentMethod.findOne({
      adapter: "test-payment-system",
    });

    await PaymentMethod.update({id: paymentMethod.id}, {enable: true}).fetch()
    
    // TODO:
    // Check amount. Check originModel. Check payment method. Check paymentResponse, compare.
  });

  it("doPaid TODO", async function () {
    emitter.on("core:payment-document-paid", "test", function (pd) {});
    // create a document with status = "PAID" and paid !== true. Check document saving, check emitter call
  });

  it("doCheck TODO", async function () {
    emitter.on("core:payment-document-check", "test",function () {});
    emitter.on("core:payment-document-checked-document", "test", function () {});
    // create a payment document for the test payment system. Make payment in the test payment system. Execute doCheck. Check the result of all event options (unpaid payment, paid payment)
  });

  it("afterUpdate(sails) TODO", async function () {
    // Create a cart. In the cart, select a payment method (test system). Make payment and check that in the cart status === 'PAID'
  });

//   it("register payment document", async function () {
    
//  });

  it("check payment processor", async function () {
    /**
     * In order to test the payment document, we create two payments. And subscribe to
     * doCheck() event; if we receive these two payments through an event, then the payment processor calls them.
     */

     let count = [];
     emitter.on("core:payment-document-check", "test", function (paymentDocument) {
       count.push(paymentDocument);
     });

    await PaymentDocument.destroy({});
    let order = await Order.create({}).fetch();

    if (!paymentMethod) throw "paymentMethod (test-payment-system) was not found "
    PaymentDocument.processor(3000);
    await PaymentDocument.register(order.id, "order", 100, paymentMethod.id, "http://", "http://", "test-payment-processor", { test: true });

    await sleep(5000);

    // // back to 120 sec payment processor
    PaymentDocument.processor(120000);
    expect(count.length).to.equal(1);
  });
});

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
