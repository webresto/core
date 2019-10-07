import Customer from "@webresto/core/modelsHelp/Customer";
import Address from "@webresto/iiko-rms-adapter/models/Address";

export default interface OrderData {
  cartId: string,
  customer: Customer,
  delivery?: {
    type: string
  },
  address: Address,
  comment: string,

}
