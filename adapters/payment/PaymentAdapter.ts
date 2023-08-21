import { Payment, PaymentResponse } from "../../interfaces/Payment";
import PaymentDocument from "../../models/PaymentDocument";
import { PaymentMethodType } from "../../libs/enums/PaymentMethodTypes";
import { Config  }from "../../interfaces/Config";


export interface InitPaymentAdapter {
  title: string;
  type: PaymentMethodType;
  adapter: string;
  description?: string;
  config?: Config
}

export default abstract class PaymentAdapter {
  public readonly InitPaymentAdapter: InitPaymentAdapter;
  public config: Config
  protected constructor(InitPaymentAdapter: InitPaymentAdapter) {
    this.InitPaymentAdapter = InitPaymentAdapter;
    this.config = InitPaymentAdapter.config
    PaymentMethod.alive(this);
  }

  /**
   * Make new payment
   * @param Payment - payment document
   * @return The result of the function of the function, the body of the response and the result of the result
   */
  public abstract createPayment(payment: Payment, backLinkSuccess: string, backLinkFail: string): Promise<PaymentResponse>;

  /**
   * Verification of payment
   * @param paymentDocument - Платежный документ
   * @return the result of the function, the body of the answer and the result of the result (you do not need to save the model)
   */
  public abstract checkPayment(paymentDocument: PaymentDocument): Promise<PaymentDocument>;

  /**
   * Method for creating and obtaining an existing Payment Adapter
   * Since there can be a lot of an adapter, this is a direct way to obtain an adapter from his class
   * @param params - Parameters for initialization
   * @deprecated
   */
  static getInstance(init: InitPaymentAdapter): PaymentAdapter {
    return PaymentAdapter.prototype;
  }
}
