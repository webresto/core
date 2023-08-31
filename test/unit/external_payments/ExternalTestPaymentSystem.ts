import PaymentAdapter from "../../../adapters/payment/PaymentAdapter";
import { PaymentResponse, Payment } from "../../../interfaces/Payment";
import { PaymentMethodType } from "../../../libs/enums/PaymentMethodTypes";
import PaymentDocument from "../../../models/PaymentDocument";

var database: any = {};

export default class TestPaymentSystem extends PaymentAdapter {
  private static instance: TestPaymentSystem;

  public async createPayment(payment: Payment, backLinkSuccess: string, backLinkFail: string, testing?: string): Promise<PaymentResponse> {
    let paid_latency;
    switch (testing) {
      case "delay_1_sec":
        paid_latency = 1000;
        break;

      case "delay_3_sec":
        paid_latency = 3000;
        break;

      case "delay_5_sec":
        paid_latency = 5000;
        break;

      case "delay_15_sec":
        paid_latency = 15000;
        break;
      case "delay_30_sec":
        paid_latency = 30000;
        break;
      case "delay_60_sec":
        paid_latency = 60000;
        break;

      default:
        paid_latency = 500;
        break;
    }

    // Imitation http latency of external system 
    let latency = Math.floor(Math.random() * 1000) + 600;
    let response: any;
    response = payment;
    response.error = null;
    response.paid = false;
    response.redirectLink = "http://redirect_link.com";

    return new Promise((resolve) => {
      setTimeout(() => {
        database[payment.originModelId] = payment;
        this.paid(payment, paid_latency);
        resolve(response);
      }, latency);
    });
  }

  public async checkPayment(payment: PaymentDocument): Promise<PaymentDocument> {
    let latency = Math.floor(Math.random() * 500) + 1;
    return new Promise((resolve) => {
      setTimeout(() => {
        let response = database[payment.originModelId];
        resolve(response);
      }, latency);
    });
  }

  public static getInstance(): TestPaymentSystem {
    if (!TestPaymentSystem.instance) {
      TestPaymentSystem.instance = new TestPaymentSystem({
        title: "test",
        type: "external",
        adapter: "test-payment-system",
      });
    }
    return TestPaymentSystem.instance;
  }

  private paid(payment: Payment, latency: number) {
    setTimeout(() => {
      database[payment.originModelId].status = "PAID";
    }, latency);
    return;
  }
}
