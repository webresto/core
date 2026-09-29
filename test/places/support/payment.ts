import PaymentAdapter from "../../../adapters/payment/PaymentAdapter";
import { Payment, PaymentResponse } from "../../../interfaces/Payment";
import { PaymentDocumentRecord } from "../../../models/PaymentDocument";

/**
 * An external payment system for the tests: it registers with core the way a
 * real one does (`PaymentMethod.alive`), hands out a payment link, and says a
 * payment is paid only once the test has paid it.
 */
export class TestPaymentSystem extends PaymentAdapter {
  /** Status by payment document id, as the gateway knows it. */
  readonly payments = new Map<string, string>();
  readonly cancelled: string[] = [];

  constructor(adapter = "payment-1") {
    super({ title: "Payment 1", type: "external", adapter });
  }

  async createPayment(payment: Payment): Promise<PaymentResponse> {
    this.payments.set(payment.id, "REGISTERED");
    return { ...payment, redirectLink: `https://payment.example/${payment.id}`, externalId: `external-${payment.id}` } as any;
  }

  async checkPayment(document: PaymentDocumentRecord): Promise<PaymentDocumentRecord> {
    return { ...document, status: this.payments.get(document.id) ?? document.status } as PaymentDocumentRecord;
  }

  async cancelPayment(document: PaymentDocumentRecord): Promise<PaymentDocumentRecord> {
    this.cancelled.push(document.id);
    this.payments.set(document.id, "CANCEL");
    return { ...document, status: "CANCEL" } as PaymentDocumentRecord;
  }

  /** The customer pays in the gateway. */
  pay(documentId: string): void {
    this.payments.set(documentId, "PAID");
  }
}

/**
 * A running test payment system and its enabled payment method. Called after
 * `resetDatabase`, which takes the method's row with it.
 */
export async function startPaymentSystem(adapter = "payment-1"): Promise<{ system: TestPaymentSystem; paymentMethod: string }> {
  const system = new TestPaymentSystem(adapter);
  await system.wait();
  const [method] = await PaymentMethod.update({ adapter }, { enable: true }).fetch();
  return { system, paymentMethod: method.id };
}
