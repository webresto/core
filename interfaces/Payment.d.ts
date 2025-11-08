/**
 * Describes the payment document
 * paid?: Sign that the document is paid
 * amount: Amount
 * isOrderPayment?: Is cart payment
 * originModel: Name of the model that initiated the payment
 * PaymentMethod: Adapter through which the payment was made
 * comment?: Comment
 * error?
 */
export interface Payment {
    id: string;
    paid?: boolean;
    amount: number;
    originModelId: string;
    externalId?: string;
    originModel: string;
    paymentMethod: string;
    comment?: string;
    error?: any;
    data?: any;
}
export interface PaymentResponse extends Payment {
    redirectLink?: string;
}
