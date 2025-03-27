/**
 * Описывает инит обеькт для регистрации "Способ оплаты"
 */

import { PaymentMethodType } from "../libs/enums/PaymentMethodTypes";


 export interface InitPaymentAdapter {
    title: string;
    type: PaymentMethodType;
    adapter: string;
    description?: string;
  }
  