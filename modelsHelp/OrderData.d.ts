import Customer from "../modelsHelp/Customer";
import Address from "../modelsHelp/Address";
export default interface OrderData {
    cartId: string;
    customer: Customer;
    delivery?: {
        type: string;
    };
    paymentMethodId?: string;
    address: Address;
    comment: string;
    selfDelivery: boolean;
}
