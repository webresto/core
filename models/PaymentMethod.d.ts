import ORMModel from "../modelsHelp/ORMModel";
import ORM from "../modelsHelp/ORM";
import PaymentAdapter from "../adapter/payment/PaymentAdapter";
/**
 * Описывает модель "Способ оплаты"
 */
export default interface PaymentMethod extends ORM, InitPaymentAdapter {
    id?: string;
    enable?: boolean;
}
/**
 * Описывает инит обеькт для регистрации "Способ оплаты"
 */
export interface InitPaymentAdapter {
    title: string;
    type: string;
    adapter: string;
    description?: string;
}
/**
 * Описывает класс PaymentMethod, используется для ORM
 */
export interface PaymentMethodModel extends ORMModel<PaymentMethod> {
    /**
     * Выключает все
     * @param paymentMethod - ключ
     * @return .
     */
    alive(paymentMethod: InitPaymentAdapter): Promise<PaymentMethod[]>;
    /**
    * Возврашает доступные для оплаты платежные методы
    */
    getAvailable(): Promise<PaymentMethod[]>;
    /**
    * Проверяет платежную систему
    */
    checkAvailable(paymentMethodId: string): Promise<boolean>;
    /**
    * Проверяет платежное обещание
    */
    isPaymentPromise(paymentMethodId: string): Promise<boolean>;
    /**
  * Возврашает екземпляр платежного адаптера
  */
    getAdapter(): Promise<PaymentAdapter>;
}
declare global {
    const PaymentMethod: PaymentMethodModel;
}
