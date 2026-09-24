/**
 * Describes the init object for registering "Payment Method"
 */
import { PaymentMethodType } from "../lib/enums/PaymentMethodTypes";
export interface InitPaymentAdapter {
    title: string;
    type: PaymentMethodType;
    adapter: string;
    description?: string;
}
