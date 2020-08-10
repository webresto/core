import ORMModel from "../modelsHelp/ORMModel";
import ORM from "../modelsHelp/ORM";
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
}
declare global {
    const PaymentMethod: PaymentMethodModel;
}
