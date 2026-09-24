import TestPaymentSystem from "./ExternalTestPaymentSystem";
import { Payment } from "../../../interfaces/Payment";
import generate_payment from "../../generators/payment.generator";
import { expect } from "chai";
import { PaymentDocumentRecord } from "../../../models/PaymentDocument";
// todo: fix types model instance to {%ModelName%}Record for PaymentDocument";

var paymentDocument: PaymentDocumentRecord;

describe("TestPaymentSystem & PaymentAdapter basic testing", function () {
  this.timeout(31000);
  var test_payment: Payment = generate_payment();

  /**
   * 1. Payment system registration test
   */
  it("PaymentSystem registration", async () => {
    const result = await TestPaymentSystem.getInstance();
    expect(result["InitPaymentAdapter"].adapter).to.equal("test-payment-system");
  });

  /**
   * 2. Payment creation test
   */

  it("Create payment test", async () => {
    const result = await TestPaymentSystem.getInstance().createPayment(test_payment, "http://back_url.com", "http://back_url.com", "delay_3_sec");
    paymentDocument = result as PaymentDocumentRecord;
    expect(result.redirectLink).to.equal("http://redirect_link.com");
  });

  /**
   * 3. Payment check (too early)
   */
  it("Testing, not yet payment check", async () => {
    const result = await TestPaymentSystem.getInstance().checkPayment(paymentDocument);
    expect(result.paid).to.equal(false);
  });

  /**
   * 4. Payment check (already paid)
   */
  it("Check done payment", async () => {
    setTimeout(async () => {
      const result = await TestPaymentSystem.getInstance().checkPayment(paymentDocument);
      expect(result.paid).to.equal(true);
    }, 3000);
  });

  // /**
  // * 4. Simultaneous payments with different delays
  // */
  // it('Several payments in one time', async () => {
  //
  //   // the cart is what has to be tested here, where payment creation is called
  //   const params = ['delay_15', 'delay_5', 'delay_1', 'delay_3']

  //   params.forEach(param => {
  //     let payment: Payment = generate_payment();
  //     TestPaymentSystem.getInstance().createPayment(payment , "test", param);
  //   });

  //   const result = await TestPaymentSystem.getInstance().createPayment(payment , "test");
  //   expect(result.redirectLink).to.equal("http://test.resto.cloud");

  // });

  /**
   *
   */
});
