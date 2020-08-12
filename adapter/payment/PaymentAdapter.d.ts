import { Payment, PaymentResponse } from "../../modelsHelp/Payment";
import { InitPaymentAdapter } from "../../models/PaymentMethod";
export default abstract class PaymentAdapter {
    protected readonly InitPaymentAdapter: InitPaymentAdapter;
    protected constructor(InitPaymentAdapter: InitPaymentAdapter);
    abstract createPayment(payment: Payment, backLink: string): Promise<PaymentResponse>;
    abstract checkPayment(payment: Payment): Promise<Payment>;
    static getInstance(...params: any[]): PaymentAdapter;
}
