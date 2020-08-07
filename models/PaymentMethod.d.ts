import ORMModel from "../modelsHelp/ORMModel";
import ORM from "../modelsHelp/ORM";
/**
 * Описывает модель "Способ оплаты"
 */
export default interface PaymentMethod extends ORM {
    id: number;
    title: string;
    description: string;
    enable: boolean;
}
/**
 * Описывает класс PaymentMethod, используется для ORM
 */
export interface PaymentMethodModel extends ORMModel<PaymentMethod> {
}
declare global {
    const PaymentMethod: PaymentMethodModel;
}
