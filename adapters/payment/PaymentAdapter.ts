import { Payment, PaymentResponse } from "../../interfaces/Payment";
import PaymentDocument from "../../models/PaymentDocument";
import { PaymentMethodType } from "../../libs/enums/PaymentMethodTypes";
import { Config } from "../../interfaces/Config";


export interface InitPaymentAdapter {
  title: string;
  type: PaymentMethodType;
  adapter: string;
  description?: string;
  config: Config
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
   * @return Результат работы функции, тело ответа и код результата
   */
  public abstract createPayment(payment: Payment, backLinkSuccess: string, backLinkFail: string): Promise<PaymentResponse>;

  /**
   * Проверка Оплаты
   * @param paymentDocument - Платежный документ
   * @return результат работы функции, тело ответа и код результата (сохранять модель не нужно)
   */
  public abstract checkPayment(paymentDocument: PaymentDocument): Promise<PaymentDocument>;

  /**
   * Метод для создания и получения уже существующего Payment adapterа
   * @param params - параметры для инициализации
   * @deprecated
   */
  static getInstance(...params: any[]): PaymentAdapter {
    return PaymentAdapter.prototype;
  }
}
