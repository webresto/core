import ORMModel from "../interfaces/ORMModel";
import ORM from "../interfaces/ORM";
import PaymentAdapter from "../adapter/payment/PaymentAdapter";
/**
 * Описывает модель "Способ оплаты"
 */
export default interface PaymentMethod extends ORM, InitPaymentAdapter {
    id: string;
    enable: boolean;
    title: string;
    type: string;
    adapter: string;
    order: number;
    description: string;
    /**
    * Возврашает екземпляр платежного адаптера от this или по названию адаптера
    */
    getAdapter(adapter?: string): Promise<PaymentAdapter>;
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
    alive(paymentMethod: PaymentAdapter): Promise<PaymentMethod[]>;
    /**
    * Возврашает доступные для оплаты платежные методы
    */
    getAvailable(): Promise<PaymentMethod[]>;
    /**
    * Проверяет платежную систему
    */
    checkAvailable(paymentMethodId: string): Promise<boolean>;
    /**
    * Возврашает екземпляр платежного адаптера по paymentMethodId
    */
    getAdapterById(paymentMethodId?: string): any;
    /**
  * Проверяет платежное обещание
  */
    isPaymentPromise(paymentMethodId?: string): Promise<boolean>;
}
declare global {
    const PaymentMethod: PaymentMethodModel;
}
