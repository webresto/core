import ORMModel from "../modelsHelp/ORMModel";
import ORM from "../modelsHelp/ORM";
/**
 * Описывает модель "Способ оплаты"
 */
export default interface PaymentMethod extends ORM {
    id: string;
    title: string;
    type: string;
    adapter: string;
    description?: string;
    enable?: boolean;
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
    alive(paymentMethod: PaymentMethod): Promise<PaymentMethod[]>;
}
declare global {
    const PaymentMethod: PaymentMethodModel;
}
