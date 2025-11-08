// todo: fix types model instance to {%ModelName%}Record for User";

import { Phone } from "../models/User";

/**
 * Describes customer data for delivery
 */
export default interface Customer {
  phone: Phone
  mail?: string;
  name: string;
}
