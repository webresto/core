// todo: fix types model instance to {%ModelName%}Record for User";

import { Phone } from "../models/User";

/**
 * Описывает данные о заказчике для доставки
 */
export default interface Customer {
  phone: Phone
  mail?: string;
  name: string;
}
