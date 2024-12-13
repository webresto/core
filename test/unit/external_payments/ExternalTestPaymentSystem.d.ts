import PaymentAdapter from "../../../adapters/payment/PaymentAdapter";
import { PaymentResponse, Payment } from "../../../interfaces/Payment";
import { PaymentDocumentRecord } from "../../../models/PaymentDocument";
export default class TestPaymentSystem extends PaymentAdapter {
    cancelPayment(PaymentDocumentRecord: PaymentDocumentRecord): Promise<PaymentDocumentRecord>;
    private static instance;
    createPayment(payment: Payment, backLinkSuccess: string, backLinkFail: string, testing?: string): Promise<PaymentResponse>;
    checkPayment(payment: PaymentDocumentRecord): Promise<PaymentDocumentRecord>;
    static getInstance(): TestPaymentSystem;
    private paid;
}
