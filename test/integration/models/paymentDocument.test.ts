import { expect } from "chai";
import TestPaymentSystem from "../../unit/external_payments/ExternalTestPaymentSystem";
import { Payment } from "../../../interfaces/Payment";
import generate_payment from "../../generators/payment.generator";
// todo: fix types model instance to {%ModelName%}Record for PaymentDocument";
//// todo: fix types model instance to {%ModelName%}Record for Order';

describe("PaymentDocument", function () {
  this.timeout(31000);
  let paymentMethod;
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
    // Проверка суммы. Проверка originModel. Проверка платежного метода. Проверить paymentResponse, сравнить.
  });

  it("doPaid TODO", async function () {
    emitter.on("core:payment-document-paid", "test", function (pd) {});
    // создать документ с status = "PAID" и paid !== true . Проверить сохраниение документа, проверить вызов эмита
  });

  it("doCheck TODO", async function () {
    emitter.on("core:payment-document-check", "test",function () {});
    emitter.on("core:payment-document-checked-document", "test", function () {});
    // создать платежный документ для тестировочной платежной системы. Провести оплату в тестовой платежной системе. Выполнить doCheck. Проверить результат всех вариантов событий (не проведенная оплата, проведенная оплата)
  });

  it("afterUpdate(sails) TODO", async function () {
    // Создать корзину. В корзине выбрать платежный метод (тестовая система). Поставить оплату и проверить что в корзине status === 'PAID'
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
