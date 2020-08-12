import ORMModel from "../modelsHelp/ORMModel";
import ORM from "../modelsHelp/ORM";
export default interface PaymentMethod extends ORM, InitPaymentAdapter {
    id?: string;
    enable?: boolean;
}
export interface InitPaymentAdapter {
    title: string;
    type: string;
    adapter: string;
    description?: string;
}
export interface PaymentMethodModel extends ORMModel<PaymentMethod> {
    alive(paymentMethod: InitPaymentAdapter): Promise<PaymentMethod[]>;
}
declare global {
    const PaymentMethod: PaymentMethodModel;
}
