import { Payment, PaymentResponse } from "../../interfaces/Payment";
import PaymentDocument from "../../models/PaymentDocument";
import { PaymentMethodType } from "../../libs/enums/PaymentMethodTypes";
import { Config } from "../../interfaces/Config";
export interface InitPaymentAdapter {
    title: string;
    type: PaymentMethodType;
    adapter: string;
    description?: string;
    config?: Config;
}
export default abstract class PaymentAdapter {
    readonly InitPaymentAdapter: InitPaymentAdapter;
    config: Config;
    private initializationPromise;
    protected constructor(InitPaymentAdapter: InitPaymentAdapter);
    /**
     * Waiting for initialization
     */
    wait(): Promise<void>;
    private initialize;
    /**
     * Make new payment
     * @return The result of the function of the function, the body of the response and the result of the result
     * @param payment
     * @param backLinkSuccess
     * @param backLinkFail
     */
    abstract createPayment(payment: Payment, backLinkSuccess: string, backLinkFail: string): Promise<PaymentResponse>;
    /**
     * Verification of payment
     * @param paymentDocument - Payment document
     * @return the result of the function, the body of the answer and the result of the result (you do not need to save the model)
     */
    abstract checkPayment(paymentDocument: PaymentDocument): Promise<PaymentDocument>;
    /**
     * Cancel of payment
     * @param paymentDocument - Payment document
     * @return the result of the function, the body of the answer and the result of the result (you do not need to save the model)
     */
    abstract cancelPayment(paymentDocument: PaymentDocument): Promise<PaymentDocument>;
    /**
     * Method for creating and obtaining an existing Payment Adapter
     * Since there can be a lot of adapters, this is a direct way to obtain an adapter from his class
     * @deprecated
     * @param init
     */
    static getInstance(init: InitPaymentAdapter): PaymentAdapter;
}
