import Customer from "../modelsHelp/Customer";
import Address from "../modelsHelp/Address";
/**
 * Описывает данные, которые необходимы для проврки и оформления заказа
 */
export default interface OrderData {
    cartId: string;
    customer: Customer;
    delivery?: {
        type: string;
    };
    paymentMethodId?: string;
    address: Address;
    comment: string;
    date: string;
    personsCount: string;
    selfDelivery: boolean;
    customInfo: any;
}
