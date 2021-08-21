import ORMModel from "../interfaces/ORMModel";
import ORM from "../interfaces/ORM";
import { PaymentResponse } from "../interfaces/Payment";
/** На примере корзины (Cart):
 * 1. Модель проводящяя оплату internal/external (например: Cart) создает PaymentDocument
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
 *    в платежном адаптере как страницу для успешного возврата. Предполагается что произойдет редирект на страницу
 *    заказа, где человек сможет увидеть состояние своего заказа. Во время загрузки этой страницы будет произведен вызов
 *    контроллера API getOrder(/api/0.5/order/:number)
 *
 * 5. Если оплата прошла успешно то PaymentProcessor  установит статус PAID в соответвующий PaymentDocument,
 *    это в свою очередь означает что PaymentDocument попытается поставить флаг isPaid: true в моделе  и совершит emit('core-payment-document-paid', document)
 *    соответсвующей originModel текущего PaymentDocument. ( В случе с Cart произойдет next(); )
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
declare type Status = "NEW" | "REGISTRED" | "PAID" | "CANCEL" | "REFUND" | "DECLINE";
/**
 * Описывает модель "Платежный документ"
 */
export default interface PaymentDocument extends ORM {
    /** Уникальный id в моделе PaymentDocument */
    id?: string;
    /** соответсвует id из модели originModel */
    paymentId: string;
    /** ID во внешней системе */
    externalId?: string;
    /** Модель из которой делается платеж */
    originModel: string;
    /** Платежный метод */
    paymentMethod: string;
    /** Сумма к оплате */
    amount: number;
    /** Признак того что платеж совершается из модели корзины */
    isCartPayment?: boolean;
    /** Флаг установлен что оплата произведена */
    paid?: boolean;
    /**  Cтатус может быть NEW REGISTRED PAID CANCEL REFUND DECLINE */
    status?: Status;
    /** Комментари для платежной системы */
    comment?: string;
    /**Ошибка во время платежа */
    error?: string;
    /**
     * Проводит оплату по платежного документу
     * @param payment - Платежный документ
     */
    doPaid(): Promise<PaymentDocument>;
    /**
     * Проверяет оплату
     * @param payment - Платежный документ
     */
    doCheck(): Promise<PaymentDocument>;
}
/**
 * Описывает класс PaymentDocument, используется для ORM
 */
export interface PaymentDocumentModel extends ORMModel<PaymentDocument> {
    /**
     * Регистрирует новый платежный документ
     * @param paymentId - UUID Идентификатор соответсвующий записи в моделе из originModel
     * @param originModel - Модель в которой иницировалась оплата
     * @param amount -  Сумма платежа
     * @param paymentMethodId - Адаптер платежей
     * @param backLinkSuccess - Сслыка для возврата успешная
     * @param backLinkFail - Сслыка для возврата не успешная
     * @param comment - Комментарий
     * @throws Object {
     *   body: string,
     *   error: number
     * }
     * where codes:
     * 1 - некорректный paymentId или originModel
     * 2 - amount не указан или плохой тип
     * 4 - paymentAdapter не существует или недоступен
     * 5 - произошла ошибка в выбранном paymentAdapter
     * 6 - произошла ошибка при создании платежного документа
     * @fires paymentdocument:core-payment-document-before-create - вызывается перед началом фунции. Результат подписок игнорируется.
     * @fires paymentdocument:core-payment-document-created - вызывается когда документ был создан. Результат подписок игнорируется.
     * @fires paymentdocument:core-payment-before-exec - вызывается перед выполнением оплаты. Результат подписок ожидается.
     * @fires paymentdocument:core-payment-document-redirect-link - вызывается после получения ссылки для редиректа. Результат подписок игнорируется.
     */
    register(paymentId: string, originModel: string, amount: number, paymentMethodId: string, backLinkSuccess: string, backLinkFail: string, comment: string, data: any): Promise<PaymentResponse>;
    /**
     * Возврашает статус платежа
     */
    status(paymentId: string): Promise<string>;
    /** Цикл проверки платежей */
    processor(timeout: number): any;
}
declare global {
    const PaymentDocument: PaymentDocumentModel;
}
export {};
