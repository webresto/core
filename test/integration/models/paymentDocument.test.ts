import { expect } from "chai";
import getEmitter from "../../../libs/getEmitter";
import TestPaymentSystem from "../../unit/external_payments/ExternalTestPaymentSystem";
import { Payment } from "../../../interfaces/Payment";
import generate_payment from "../../generators/payment.generator";
import PaymentDocument from "../../../models/PaymentDocument";
//import Order from '../../../models/Order';

describe("PaymentDocument", function () {
  this.timeout(31000);

  /**
   * 
   */
  it("register TODO", async function () {
    TestPaymentSystem.getInstance();
    //static
    // Проверка суммы. Проверка originModel. Проверка платежного метода. Проверить paymentResponse, сравнить.
  });

  it("doPaid TODO", async function () {
    getEmitter().on("core-payment-document-paid", function () {});
    // создать документ с status = "PAID" и paid !== true . Проверить сохраниение документа, проверить вызов эмита
  });

  it("doCheck TODO", async function () {
    getEmitter().on("core-payment-document-check", function () {});
    getEmitter().on("core-payment-document-checked-document", function () {});
    // создать платежный документ для тестировочной платежной системы. Провести оплату в тестовой платежной системе. Выполнить doCheck. Проверить результат всех вариантов событий (не проведенная оплата, проведенная оплата)
  });

  it("afterUpdate(sails) TODO", async function () {
    // Создать корзину. В корзине выбрать платежный метод (тестовая система). Поставить оплату и проверить что в корзине status === 'PAID'
  });

  it("check payment processor", async function () {
    /**
     * Для того чтобы протестировать платежный документ мы создаем два платежа. И подписываемся на
     * событие doCheck(); если мы получаем эти два платежа через евент, то процессор платежей их вызывает.
     */

    // let count = [];
    // getEmitter().on("core-payment-document-check", function (paymentDocument) {
    //   count.push(paymentDocument);
    // });

    // await PaymentDocument.destroy({});
    // let order = await Order.create({}).fetch();
    // let paymentMethod = await PaymentMethod.findOne({
    //   adapter: "test-payment-system",
    // });
    
    // 
    // if (!paymentMethod) throw "paymentMethod (test-payment-system) was not found "
    // PaymentDocument.processor(3000);
    // await PaymentDocument.register(order.id, "order", 100, paymentMethod.id, "http://", "http://", "test-payment-processor", { test: true });

    // await sleep(5000);

    // // back to 120 sec payment processor
    // PaymentDocument.processor(120000);
    // //    // expect(count.length).to.equal(1);
  });
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
