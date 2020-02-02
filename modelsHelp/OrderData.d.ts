import Customer from "@webresto/core/modelsHelp/Customer";
import Address from "@webresto/core/modelsHelp/Address";
/**
 * Описывает данные, которые необходимы для проврки и оформления заказа
 */
export default interface OrderData {
    cartId: string;
    customer: Customer;
    delivery?: {
        type: string;
    };
    address: Address;
    comment: string;
    selfDelivery: boolean;
}
