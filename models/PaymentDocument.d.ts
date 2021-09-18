/// <reference types="node" />
import ORMModel from "../interfaces/ORMModel";
import ORM from "../interfaces/ORM";
import { PaymentResponse } from "../interfaces/Payment";
import PaymentMethod from "../models/PaymentMethod";
declare let attributes: {
  /** Уникальный id в моделе PaymentDocument */
  id: string;
  /** соответсвует id из модели originModel */
  paymentId: string;
  /** ID во внешней системе */
  externalId: string;
  /** Модель из которой делается платеж */
  originModel: string;
  /** Платежный метод */
  paymentMethod: string | PaymentMethod;
  /** Сумма к оплате */
  amount: number;
  /** Флаг установлен что оплата произведена */
  paid: boolean;
  /**  Cтатус может быть NEW REGISTRED PAID CANCEL REFUND DECLINE */
  status: string;
  /** Комментари для платежной системы */
  comment: string;
  /** ВЕРОЯТНО ТУТ ЭТО НЕ НУЖНО */
  redirectLink: string;
  /** Текст ошибки */
  error: string;
};
declare type attributes = typeof attributes;
interface PaymentDocument extends attributes, ORM {}
export default PaymentDocument;
declare let Model: {
  doPaid: (criteria: any) => Promise<PaymentDocument>;
  doCheck: (criteria: any) => Promise<PaymentDocument>;
  register: (
    paymentId: string,
    originModel: string,
    amount: number,
    paymentMethodId: string,
    backLinkSuccess: string,
    backLinkFail: string,
    comment: string,
    data: any
  ) => Promise<PaymentResponse>;
  afterUpdate: (values: PaymentDocument, next: any) => Promise<void>;
  /** Цикл проверки платежей */
  processor: (timeout: number) => Promise<NodeJS.Timeout>;
};
declare global {
  const PaymentDocument: typeof Model & ORMModel<PaymentDocument>;
}
