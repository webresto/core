import PaymentAdapter from "../../../adapters/payment/PaymentAdapter";
import { PaymentResponse, Payment } from "../../../interfaces/Payment";
export default class TestPaymentSystem extends PaymentAdapter {
    cancelPayment(paymentDocument: PaymentDocument): Promise<PaymentDocument>;
    private static instance;
    createPayment(payment: Payment, backLinkSuccess: string, backLinkFail: string, testing?: string): Promise<PaymentResponse>;
    checkPayment(payment: PaymentDocument): Promise<PaymentDocument>;
    static getInstance(): TestPaymentSystem;
    private paid;
}
