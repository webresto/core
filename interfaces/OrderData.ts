import Customer from "./Customer";
import OrderAddress from "./OrderAddress";

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
  address: OrderAddress;
  comment: string;
  date: string;
  personsCount: string;
  serviceType: "delivery" | "pickup" | "dine-in";
  customInfo: any;
}
