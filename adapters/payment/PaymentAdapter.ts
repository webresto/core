import { Payment, PaymentResponse } from "../../interfaces/Payment";
import { InitPaymentAdapter } from "../../interfaces/InitPaymentAdapter";
import PaymentDocument from "../../models/PaymentDocument";
/**
 * The abstract class of the Payment adapter. Used to create new payment system adapters.
 */

export default abstract class PaymentAdapter {
  public readonly InitPaymentAdapter: InitPaymentAdapter;

  protected constructor(InitPaymentAdapter: InitPaymentAdapter) {
    this.InitPaymentAdapter = InitPaymentAdapter;
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
   * Метод для создания и получения уже существующего Payment адаптера
   * @param params - параметры для инициализации
   */
  static getInstance(...params): PaymentAdapter {
    return PaymentAdapter.prototype;
  }
}
