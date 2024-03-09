import { ORMModel } from "../interfaces/ORMModel";
import ORM from "../interfaces/ORM";
import PaymentAdapter from "../adapters/payment/PaymentAdapter";
import { OptionalAll, RequiredField } from "../interfaces/toolsTS";
import { PaymentMethodType } from "../libs/enums/PaymentMethodTypes";
interface ExternalPayment {
    name: string;
    id: string;
}
declare let attributes: {
    /** ID of the payment method */
    id: string;
    externalId: {
        type: string;
        allowNull: boolean;
    };
    /** The name of the payment method */
    title: string;
    /**
     * Types of payments, internal - internal (when a request to the external system is not required)
     * external - when to expect confirmation of payment in the external system
     * Promise - types of payment upon receipt
     */
    type: PaymentMethodType;
    isCash: boolean;
    adapter: string;
    sortOrder: number;
    description: string;
    enable: boolean;
    customData: string | {
        [key: string]: string | number | boolean;
    };
};
type attributes = typeof attributes;
interface PaymentMethod extends RequiredField<OptionalAll<attributes>, "type" | "adapter" | "enable">, ORM {
}
export default PaymentMethod;
declare let Model: {
    /**
     * Returns the authority of payment Adapter by the famous name Adapter
     * @return PaymentAdapter
     * @param adapter
     */
    getAdapter(adapter?: string): Promise<PaymentAdapter>;
    beforeCreate: (paymentMethod: any, cb: (err?: string) => void) => void;
    /**
     * Returns True if the payment method is a promise of payment
     * @param  paymentMethodId
     * @return
     */
    isPaymentPromise(paymentMethodId?: string): Promise<boolean>;
    /**
     * returns list of externalPaymentId
     * @return { name: string, id: string }
     */
    getExternalPaymentMethods(): Promise<ExternalPayment[]>;
    /**
     * Adds to the list possible to use payment ADAPTERs at their start.
     * If the payment method does not dry in the database, it creates it
     * @return string[]
     * @param paymentAdapter
     */
    alive(paymentAdapter: PaymentAdapter): Promise<string[]>;
    /**
     * Returns an array with possible methods of payment for ORDER
     * @return array of types of payments
     */
    getAvailable(): Promise<PaymentMethod[]>;
    /**
     * Checks the payment system for accessibility, and inclusion,
     * For the system of systems, only inclusion.
     * @param paymentMethodId
     * @return
     */
    checkAvailable(paymentMethodId: string): Promise<boolean>;
    /**
     * Returns the authority of payment Adapter by the famous ID PaymentMethod
     * @param  paymentMethodId
     * @return PaymentAdapter
     * @throws
     */
    getAdapterById(paymentMethodId: string): Promise<PaymentAdapter>;
};
declare global {
    const PaymentMethod: typeof Model & ORMModel<PaymentMethod, "type" | "adapter" | "enable">;
}
