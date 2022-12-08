/**
 * Описывает инит обеькт для регистрации "Способ оплаты"
 */
import { PaymentMethodType } from "../models/PaymentMethod";
export interface InitPaymentAdapter {
    title: string;
    type: PaymentMethodType;
    adapter: string;
    description?: string;
}
