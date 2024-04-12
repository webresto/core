import { ORMModel } from "../interfaces/ORMModel";
import ORM from "../interfaces/ORM";
import { PaymentResponse } from "../interfaces/Payment";
import { OptionalAll } from "../interfaces/toolsTS";
/** on the example of the basket (Order):
 * 1. Model Conducting Internal/External (for example: Order) creates PaymentDocument
 *
 * 2. PaymentDocument, when creating a new payment order, finds the desired payment method
 * and creates payment in the payment system (there is a redirect for a payment form)
 *
 * 3. When a person paid, depending on the logic of the work of the payment gateway.PaymentProcessor or
 * Getting a call from the payment system,
 * Or we will interview the payment system until we find out the state of the payment.
 * PaymentProcessor has a timer in order to interview payment systems about the state of payment;
 * Thus, in the payment system, an additional survey does not need to be implemented, only the Check function
 *
 * 4. At the time when a person completed the work with the gateway and made payment, he will return to the page indicated
 * In the payment Adapter as a page for a successful return.It is assumed that the redirect to the page will occur
 * an order where a person can see the state of his order.During the load of this page, a call will be made
 * Controller API Getorder (/Api/0.5/order ::::
 *
 * 5. If the payment was successful, then PaymentProcessor will set the PAID status in accordance with PaymentDocument,
 * This, in turn, means that PaymentDocument will try to put the ISPAID: true in the model and make EMIT ('core:payment-Document-Paid', Document)
 * Corresponding Originmodel of the current PaymentDocument.(In the service with ORDER, Next ();)
 *
 * 6. In the event of a change in payment status, an EMIT ('core:payment-Document-Status', Document) will occur where any system can be able
 * to register for changes in status.
 *
 * 7. In the event of unsuccessful payment, the user will be returned to the page of the notification of unsuccessful payment and then there will be a redirect to the page
 * placing an order so that the user can try to pay the order again.
 */
/**
  REGISTERED - the order is registered, but not paid;
  PAID - complete authorization of the amount of the order was carried out;
  CANCEL - authorization canceled;
  REFUND - the transaction was carried out by the return operation;
  DECLINE - Authorization is rejected.
  WAIT_CAPTURE - Waiting for the frozen money to be debited from the account
*/
type PaymentDocumentStatus = "NEW" | "REGISTERED" | "PAID" | "CANCEL" | "REFUND" | "DECLINE" | "WAIT_CAPTURE";
declare let attributes: {
    /** Unique ID in PaymentDocument */
    id: string;
    /** corresponds to ID from the Origin Model model */
    originModelId: string;
    /** ID in the external system */
    externalId: string;
    /** Model from which payment is made*/
    originModel: string;
    /** Payment method */
    paymentMethod: any;
    /** The amount for payment*/
    amount: number;
    /** The flag is established that payment was made*/
    paid: boolean;
    status: PaymentDocumentStatus;
    /** Comments for payment system */
    comment: string;
    /** It is probably not necessary here */
    redirectLink: string;
    /** Error text */
    error: string;
    data: any;
};
type attributes = typeof attributes;
interface PaymentDocument extends OptionalAll<attributes>, ORM {
}
export default PaymentDocument;
declare let Model: {
    beforeCreate(paymentDocumentInit: any, cb: (err?: string) => void): void;
    doCheck: (criteria: any) => Promise<PaymentDocument>;
    register: (originModelId: string, originModel: string, amount: number, paymentMethodId: string, backLinkSuccess: string, backLinkFail: string, comment: string, data: any) => Promise<PaymentResponse>;
    afterUpdate: (values: PaymentDocument, next: any) => Promise<void>;
    /** Payment check cycle*/
    processor: (timeout: number) => Promise<ReturnType<typeof setInterval>>;
};
declare global {
    const PaymentDocument: typeof Model & ORMModel<PaymentDocument, null>;
}
