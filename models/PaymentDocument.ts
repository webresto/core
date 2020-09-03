import ORMModel from "../modelsHelp/ORMModel";
import ORM from "../modelsHelp/ORM";
import uuid = require('uuid/v4');
import { PaymentResponse, Payment }  from "../modelsHelp/Payment"
import PaymentMethod from "../models/PaymentMethod";
import PaymentAdapter from "../adapter/payment/PaymentAdapter";
import getEmitter from "../lib/getEmitter";


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
type Status = 'NEW'|'REGISTRED'|'PAID'|'CANCEL'|'REFUND'|'DECLINE';

module.exports = {
  attributes: {
    id: {
      type: 'string',
      primaryKey: true
    },
    paymentId: 'string',
    originModel: 'string',
    PaymentMethod: {
      collection: 'PaymentMethod',
      via: 'id'
    },
    amount: 'integer',
    paid: {
      type: 'boolean',
      defaultsTo: false
    },
    status: {
      type:'string', 
      enum: ['NEW','REGISTRED', 'PAID', 'CANCEL','REFUND', 'DECLINE']
    },
    comment: 'string',
    redirectLink: 'string',
    error: 'string',
  },

  beforeCreate: function (paymentDocument, next) {
    paymentDocument.id = uuid();
    paymentDocument.status = "NEW";
    next();
  },
     // PAYMENT payment document/ register
  register: async function (paymentId: string, originModel: string, amount: number, paymentMethodId: string,  backLinkSuxess: string, backLinkFail: string, comment: string): Promise<PaymentResponse> {
    checkAmount(amount);
    await checkOrigin(originModel, paymentId);
    await checkPaymentMethod(paymentMethodId);
    let payment: Payment = {paymentId: paymentId, originModel: originModel, PaymentMethod: paymentMethodId, amount:amount }
    const emitter = getEmitter();
    getEmitter().emit('core-payment-document-before-create', payment); 
    try {
        let paymentDocument = await PaymentDocument.create(payment)
    } catch (error) {
      throw {
        code: 6,
        error: 'PaymentDocument not created'
      }
    }
    let paymentAdapter: PaymentAdapter  = await PaymentMethod.getAdapterById(paymentMethodId);
    return await paymentAdapter.createPayment(payment, backLinkSuxess, backLinkFail)
    // PTODO: тут надо обрабоать ошибки
  },
};

async function checkOrigin(originModel: string,  paymentId: string) {
  //@ts-ignore
  if (! await sails.models[originModel].findOne(paymentId)) {
    throw {
      code: 1,
      error: 'incorrect paymentId or originModel'
    }
  }
}

function checkAmount(amount: number) {
  if (!amount || amount <= 0) {
    throw {
      code: 2,
      error: 'incorrect amount'
    }
  }
  if (!(amount % 1 === 0)){
    throw {
      code: 2,
      error: 'incorrect amount'
    }
  }
}

async function checkPaymentMethod(paymentMethodId) {
  if (! await PaymentMethod.checkAvailable(paymentMethodId)) {
    throw {
      code: 4,
      error: 'paymentAdapter not available'
    }
  }
}

/**
 * Описывает модель "Платежный документ"
 */
export default interface PaymentDocument extends ORM  {
  id?: string;
  paymentId: string;
  originModel: string;
  paymentAdapter: Association<PaymentMethod>;
  amount: number;
  isCartPayment: boolean;
  paid: boolean;
  status: Status;
  comment: string;
  error: string;
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
   * @param backLinkSuxess - Сслыка для возврата успешная
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
  register( paymentId: string, originModel: string, amount: number, paymentMethodId: string,  backLinkSuxess: string, backLinkFail: string, comment: string): Promise<PaymentDocument>;

  /**
  * Возврашает статус платежа
  */
  status(paymentId: string): Promise<string>;
}

declare global {
  const PaymentDocument: PaymentDocumentModel;
}
