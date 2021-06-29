import ORMModel from "../modelsHelp/ORMModel";
import ORM from "../modelsHelp/ORM";
import { v4 as uuid } from 'uuid';
import { PaymentResponse, Payment }  from "../modelsHelp/Payment"
import PaymentMethod from "../models/PaymentMethod";
import PaymentAdapter from "../adapter/payment/PaymentAdapter";
import getEmitter from "../lib/getEmitter";
import { NetworkInterfaceInfoIPv4 } from "os";


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

let payment_processor_interval: ReturnType<typeof setInterval>;

module.exports = {
  autoPK: false,
  attributes: {
    id: {
      type: 'string',
      primaryKey: true,
      defaultsTo: function (){ return uuid();}
    }, 
    paymentId: 'string',
    externalId: 'string',
    originModel: 'string',
    paymentMethod: {
      model: 'PaymentMethod',
    },
    amount: 'integer',
    paid: {
      type: 'boolean',
      defaultsTo: false
    },
    status: {
      type:'string', 
      enum: ['NEW','REGISTRED', 'PAID', 'CANCEL','REFUND', 'DECLINE'],
      defaultsTo: 'NEW'
    },
    comment: 'string',
    redirectLink: 'string',
    error: 'string',
    doPaid: async function (): Promise<PaymentDocument> {
      const self: PaymentDocument = this;   
      
      if (self.status === "PAID" && self.paid !== true){
        self.status = "PAID";
        self.paid = true;
        getEmitter().emit('core-payment-document-paid', self); 
        await self.save();
      }
      return self;
    },
    doCheck: async function (): Promise<PaymentDocument> {
      const self: PaymentDocument = this;   
      getEmitter().emit('core-payment-document-check', self); 
      try {
        let paymentAdapter: PaymentAdapter  = await PaymentMethod.getAdapterById(self.paymentMethod);
        let checkedPaymentDocument: PaymentDocument = await paymentAdapter.checkPayment(self);   
        if (checkedPaymentDocument.status === "PAID" && checkedPaymentDocument.paid !== true){
          await checkedPaymentDocument.doPaid();
        } else {
          await PaymentDocument.update({id: self.id}, {status: checkedPaymentDocument.status});
        }
        getEmitter().emit('core-payment-document-checked-document', checkedPaymentDocument); 
        return checkedPaymentDocument;
      } catch (e) {
        sails.log.error("PAYMENTDOCUMENT > doCheck error :", e);
      }
    },
  },

  register: async function (paymentId: string, originModel: string, amount: number, paymentMethodId: string,  backLinkSuccess: string, backLinkFail: string, comment: string, data: any): Promise<PaymentResponse> {
    checkAmount(amount);
    await checkOrigin(originModel, paymentId);
    await checkPaymentMethod(paymentMethodId);
    var id: string = uuid(); id = id.substr(id.length - 8).toUpperCase();
    let payment: Payment = { id: id, paymentId: paymentId, originModel: originModel, paymentMethod: paymentMethodId, amount:amount, comment: comment, data: data}
    
    getEmitter().emit('core-payment-document-before-create', payment); 
    try {
        await PaymentDocument.create(payment)
    } catch (e) { 
      getEmitter().emit('error',"PaymentDocument > register:", e); 
      sails.log.error("Error in paymentAdapter.createPayment :", e);
      throw {
        code: 3,
        error: 'PaymentDocument not created: ' + e
      }
    }
    
    let paymentAdapter: PaymentAdapter  = await PaymentMethod.getAdapterById(paymentMethodId);
    sails.log.debug("PaymentDocumnet > register [paymentAdapter]",paymentMethodId, paymentAdapter);
    try {
        sails.log.verbose("PaymentDocumnet > register [before paymentAdapter.createPayment]", payment, backLinkSuccess, backLinkFail);
        let paymentResponse: PaymentResponse = await paymentAdapter.createPayment(payment, backLinkSuccess, backLinkFail)
        await PaymentDocument.update({id: paymentResponse.id}, {
          status: 'REGISTRED', 
          externalId: paymentResponse.externalId,
          redirectLink: paymentResponse.redirectLink
        });
        return paymentResponse
    } catch (e) {
      getEmitter().emit('error',"PaymentDocument > register:", e);
      sails.log.error("Error in paymentAdapter.createPayment :",e);
      throw {
        code: 4,
        error: 'Error in paymentAdapter.createPayment :' + e
      }
    }
  },
  afterUpdate: async function (values: PaymentDocument, next) {
    sails.log.silly('PaymentDocument > afterUpdate > ', JSON.stringify(values));
    if (values.paid && values.status === 'PAID') { 
      try {
        if(!values.amount || !values.paymentMethod || !values.paymentId){
          sails.log.error("PaymentDocument > afterUpdate, not have requried fields :", values);
          throw "PaymentDocument > afterUpdate, not have requried fields"
        }
        await sails.models[values.originModel].doPaid(values)
      } catch (e) {
        sails.log.error("Error in PaymentDocument.afterUpdate :", e);
      }
    }
    next();
  },


  /** Цикл проверки платежей */
  processor: async function(timeout: number) {
    sails.log.info("PaymentDocument.processor > started with timeout: "+ timeout );
    return payment_processor_interval = setInterval(async () => {
      
      let actualTime = new Date();

      let actualPaymentDocuments: PaymentDocument[] = await PaymentDocument.find({status: "REGISTRED"});
      
      /** Если дата создания платежногоДокумента больше чем час назад ставим статус просрочено*/
      actualTime.setHours( actualTime.getHours() - 1 );
      for await ( let actualPaymentDocument of actualPaymentDocuments) {
        if (actualPaymentDocument.createdAt < actualTime) {
          await PaymentDocument.update({id: actualPaymentDocument.id},{status: "DECLINE"})
        } else {
          sails.log.info("PAYMENT DOCUMENT > processor actualPaymentDocuments", actualPaymentDocument.id, actualPaymentDocument.createdAt, "after:" ,actualTime);
          await actualPaymentDocument.doCheck();
        }
      }
    }, timeout || 120000);
    
  }
};



async function checkOrigin(originModel: string,  paymentId: string) {
  //@ts-ignore
  if (! await sails.models[originModel].findOne({id: paymentId})) {
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
  // TODO: разобраться зачем это нужно, для сбербанка
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
  register( paymentId: string, originModel: string, amount: number, paymentMethodId: string,  backLinkSuccess: string, backLinkFail: string, comment: string, data: any): Promise<PaymentResponse>;

  /**
  * Возврашает статус платежа
  */
  status(paymentId: string): Promise<string>;

  /** Цикл проверки платежей */
  processor(timeout: number); 

}

declare global {
  const PaymentDocument: PaymentDocumentModel;
}
