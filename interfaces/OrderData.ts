import Customer from "./Customer";
import Address from "./Address";

/**
 * Describes the data required for order verification and processing
 */
export default interface OrderData {
  orderId: string;
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
