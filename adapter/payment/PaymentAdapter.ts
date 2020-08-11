
import { Payment, PaymentResponse } from "../../modelsHelp/Payment"
import { InitPaymentAdapter }   from "../../models/PaymentMethod";

/**
 * Абстрактный класс Payment адаптера. Используется для создания новых адаптеров платежных систем.
 */

export default abstract class PaymentAdapter {
  protected readonly InitPaymentAdapter: InitPaymentAdapter;

  protected constructor(InitPaymentAdapter: InitPaymentAdapter) {
    this.InitPaymentAdapter = InitPaymentAdapter;
    PaymentMethod.alive(this.InitPaymentAdapter);
  }


  /**
   * Создание Оплаты
   * @param Payment - Платежный документ
   * @return Результат работы функции, тело ответа и код результата
   */
  public abstract async createPayment(payment: Payment, backLink: string):  Promise<PaymentResponse>;

  /**
   * Проверка Оплаты
   * @param Payment - Платежный документ
   * @return результат работы функции, тело ответа и код результата
   */
  public abstract async checkPayment(payment: Payment): Promise<Payment>;

  /**
   * Метод для создания и получения уже существующего Payment адаптера
   * @param params - параметры для инициализации
   */
  static getInstance(...params): PaymentAdapter {return PaymentAdapter.prototype};
}
