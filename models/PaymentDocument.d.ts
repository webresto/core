/// <reference types="node" />
import { ORMModel } from "../interfaces/ORMModel";
import ORM from "../interfaces/ORM";
import { PaymentResponse } from "../interfaces/Payment";
import { OptionalAll } from "../interfaces/toolsTS";
/** На примере корзины (Order):
 * 1. Модель проводящяя оплату internal/external (например: Order) создает PaymentDocument
 *
 * 2. PaymentDocument при создании нового платежного поручения находит нужный платежный метод
 *    и создает оплату в платежной системе (происходит редирект на платежную форму)
 *
 * 3. Когда человек оплатил в зависимости от логики работы платежного шлюза. PaymentProcessor либо
 *    получет вызов  от платежной системы когда PaymentAdapter создаст емит emitter.on('payment'),
 *    либо будем опрашивать платежную систему пока не выясним состояние платежа.
 *    PaymentProcessor имеет таймер для того чтобы опрашивать платежные системы о состоянии платежа,
 *    таким образом  в платежной системе дополнительно опрос не нужно реализовывать, только функцию check
 *
 * 4. В то время когда человек завершил работу со шлюзом и произвел оплату, его вернет на страницу указанную
 *    в платежном adapterе как страницу для успешного возврата. Предполагается что произойдет редирект на страницу
 *    заказа, где человек сможет увидеть состояние своего заказа. Во время загрузки этой страницы будет произведен вызов
 *    контроллера API getOrder(/api/0.5/order/:number)
 *
 * 5. Если оплата прошла успешно то PaymentProcessor  установит статус PAID в соответвующий PaymentDocument,
 *    это в свою очередь означает что PaymentDocument попытается поставить флаг isPaid: true в моделе  и совершит emit('core-payment-document-paid', document)
 *    соответсвующей originModel текущего PaymentDocument. ( В случе с Order произойдет next(); )
 *
 * 6. В случае изменения статуса оплаты произойдет вызов  emit('core-payment-document-status', document) где любая система сможет
 *    отрегировать на изменения статуса,
 *
 * 7. В случае неуспешной оплаты пользователь будет возвращен на страницу уведомения о неуспешной оплате и далее будет редирект на страницу
 *    оформления заказа, для того чтобы пользователь смог попытатся оплатить заказ еще раз.
 */
/**
  REGISTRED - заказ зарегистрирован, но не оплачен;
  PAID - проведена полная авторизация суммы заказа;
  CANCEL - авторизация отменена;
  REFUND - по транзакции была проведена операция возврата;
  DECLINE - авторизация отклонена.
*/
declare enum PaymentDocumentStatus {
    NEW = "NEW",
    REGISTRED = "REGISTRED",
    PAID = "PAID",
    CANCEL = "CANCEL",
    REFUND = "REFUND",
    DECLINE = "DECLINE"
}
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
    paymentMethod: any;
    /** Сумма к оплате */
    amount: number;
    /** Флаг установлен что оплата произведена */
    paid: boolean;
    status: PaymentDocumentStatus;
    /** Комментари для платежной системы */
    comment: string;
    /** ВЕРОЯТНО ТУТ ЭТО НЕ НУЖНО */
    redirectLink: string;
    /** Текст ошибки */
    error: string;
    data: any;
};
type attributes = typeof attributes;
interface PaymentDocument extends OptionalAll<attributes>, ORM {
}
export default PaymentDocument;
declare let Model: {
    beforeCreate(paymentDocumentInit: any, cb: (err?: string) => void): void;
    doCheck: (criteria: any) => Promise<PaymentDocument>;
    /**
     * Registred new payment
     * @param paymentId
     * @param originModel
     * @param amount
     * @param paymentMethodId
     * @param backLinkSuccess
     * @param backLinkFail
     * @param comment
     * @param data
     * @returns
     */
    register: (paymentId: string, originModel: string, amount: number, paymentMethodId: string, backLinkSuccess: string, backLinkFail: string, comment: string, data: any) => Promise<PaymentResponse>;
    afterUpdate: (values: PaymentDocument, next: any) => Promise<void>;
    /** Цикл проверки платежей */
    processor: (timeout: number) => Promise<NodeJS.Timeout>;
};
declare global {
    const PaymentDocument: typeof Model & ORMModel<PaymentDocument, null>;
}
