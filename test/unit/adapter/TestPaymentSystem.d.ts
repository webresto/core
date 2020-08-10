import PaymentAdapter from '../../../adapter/payment/PaymentAdapter';
import { CreatePaymentReturn, CheckPaymentReturn } from '../../../adapter/payment/PaymentAdapter';
import Payment from '../../../modelsHelp/Payment';
export default class TestPaymentSystem extends PaymentAdapter {
    private static instance;
    createPayment(payment: Payment, backLink: string): Promise<CreatePaymentReturn>;
    checkPayment(payment: Payment): Promise<CheckPaymentReturn>;
    static getInstance(): TestPaymentSystem;
}
