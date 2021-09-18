import Customer from "./Customer";
import Address from "./Address";
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
  selfService: boolean;
  customInfo: any;
}
