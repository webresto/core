import PaymentAdapter from '../../../adapter/payment/PaymentAdapter';
import { PaymentResponse, Payment } from "../../../modelsHelp/Payment";
import PaymentDocument from "../../../models/PaymentDocument";
export default class TestPaymentSystem extends PaymentAdapter {
    private static instance;
    createPayment(payment: Payment, backLinkSuccess: string, backLinkFail: string, testing?: string): Promise<PaymentResponse>;
    checkPayment(payment: PaymentDocument): Promise<PaymentDocument>;
    static getInstance(): TestPaymentSystem;
    private paid;
}
