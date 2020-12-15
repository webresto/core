
import { Payment, PaymentResponse } from "../../modelsHelp/Payment"
import { InitPaymentAdapter }   from "../../models/PaymentMethod";
import PaymentDocument from "../../models/PaymentDocument"
/**
 * Абстрактный класс Payment адаптера. Используется для создания новых адаптеров платежных систем.
 */

export default abstract class PaymentAdapter {
  public readonly InitPaymentAdapter: InitPaymentAdapter;

  protected constructor(InitPaymentAdapter: InitPaymentAdapter) {
    this.InitPaymentAdapter = InitPaymentAdapter;
    PaymentMethod.alive(this);
  }

  /**
   * Создание Оплаты
   * @param Payment - Платежный документ
   * @return Результат работы функции, тело ответа и код результата
   */
  public abstract createPayment(payment: Payment, backLinkSuccess: string, backLinkFail: string):  Promise<PaymentResponse>;

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
 static getInstance(...params): PaymentAdapter {return PaymentAdapter.prototype};
}
