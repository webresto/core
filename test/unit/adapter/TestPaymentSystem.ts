import PaymentAdapter from '../../../adapter/payment/PaymentAdapter';
import {CreatePaymentReturn, CheckPaymentReturn} from '../../../adapter/payment/PaymentAdapter';
// import { PaymentType } from '../../../models/PaymentMethod'
import Payment from '../../../modelsHelp/Payment'
export default class TestPaymentSystem extends PaymentAdapter {
  private static instance: TestPaymentSystem;

  public async createPayment(payment: Payment, backLink: string): Promise<CreatePaymentReturn> {
    return new Promise((resolve) => {
      let latency = Math.floor(Math.random() * 2400) + 600;
      setTimeout(() => {
        resolve({
          redirectLink: "http://test.webresto.dev",
          payment: payment, 
          error: null
        });
      }, latency);
    });
  }

  public async checkPayment(payment: Payment): Promise<CheckPaymentReturn> {
    let latency = Math.floor(Math.random() * 1200) + 1;
    const rand = Boolean(Math.round(Math.random()));
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          paid: rand,
          payment: payment, 
          error: null
        });
      }, latency);
    });
  }

  public static getInstance(): TestPaymentSystem {
    if (!TestPaymentSystem.instance) {
      TestPaymentSystem.instance = new TestPaymentSystem({
        title: "test",
        type: 'external',
        adapter: "test-payment-system"
      });
    }
    return TestPaymentSystem.instance;
  }
}