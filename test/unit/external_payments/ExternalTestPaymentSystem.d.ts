import PaymentAdapter from '../../../adapter/payment/PaymentAdapter';
import { PaymentResponse, Payment } from "../../../modelsHelp/Payment";
export default class TestPaymentSystem extends PaymentAdapter {
    private static instance;
    createPayment(payment: Payment, backLink: string, testing?: string): Promise<PaymentResponse>;
    checkPayment(payment: Payment): Promise<Payment>;
    static getInstance(): TestPaymentSystem;
    private paid;
}
