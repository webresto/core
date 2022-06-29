import ORMModel from "../interfaces/ORMModel";
import ORM from "../interfaces/ORM";
import { v4 as uuid } from "uuid";
import { PaymentResponse, Payment } from "../interfaces/Payment";
import PaymentMethod from "../models/PaymentMethod";
import PaymentAdapter from "../adapters/payment/PaymentAdapter";
import getEmitter from "../libs/getEmitter";

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
 *    в платежном адаптере как страницу для успешного возврата. Предполагается что произойдет редирект на страницу
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

enum PaymentDocumentStatus {
  NEW = "NEW",
  REGISTRED = "REGISTRED",
  PAID = "PAID",
  CANCEL = "CANCEL",
  REFUND = "REFUND",
  DECLINE = "DECLINE"
}

let payment_processor_interval: ReturnType<typeof setInterval>;

let attributes = {
  /** Уникальный id в моделе PaymentDocument */
  id: {
    type: "string",
    //required: true,
  } as unknown as string,

  /** соответсвует id из модели originModel */
  paymentId: "string",

  /** ID во внешней системе */
  externalId: "string",

  /** Модель из которой делается платеж */
  originModel: "string",

  /** Платежный метод */
  paymentMethod: {
    model: "PaymentMethod",
  } as unknown as PaymentMethod | any,

  /** Сумма к оплате */
  amount: "number" as unknown as number,

  /** Флаг установлен что оплата произведена */
  paid: {
    type: "boolean",
    defaultsTo: false,
  } as unknown as boolean,

  status: {
    type: "string",
    isIn: ["NEW", "REGISTRED", "PAID", "CANCEL", "REFUND", "DECLINE"],
    defaultsTo: "NEW",
  } as unknown as PaymentDocumentStatus,

  /** Комментари для платежной системы */
  comment: "string",

  /** ВЕРОЯТНО ТУТ ЭТО НЕ НУЖНО */
  redirectLink: "string",

  /** Текст ошибки */
  error: "string",
};

type attributes = typeof attributes;
interface PaymentDocument extends attributes, ORM {}
export default PaymentDocument;
let Model = {
  beforeCreate(paymentDocumentInit: any, next: any) {
    if (!paymentDocumentInit.id) {
      paymentDocumentInit.id = uuid();
    }

    next();
  },
  doCheck: async function (criteria: any): Promise<PaymentDocument> {
    const self: PaymentDocument = (await PaymentDocument.find(criteria).limit(1))[0];
    if (!self) throw `PaymentDocument is not found`

    getEmitter().emit("core-payment-document-check", self);
    try {
      let paymentAdapter: PaymentAdapter = await PaymentMethod.getAdapterById(self.paymentMethod);
      let checkedPaymentDocument: PaymentDocument = await paymentAdapter.checkPayment(self);
      sails.log.debug("checkedPaymentDocument >> ", checkedPaymentDocument)



      if (checkedPaymentDocument.status === "PAID") {
        await PaymentDocument.update({ id: self.id }, { status: checkedPaymentDocument.status, paid: true }).fetch();
      } else {
        await PaymentDocument.update({ id: self.id }, { status: checkedPaymentDocument.status }).fetch();
      }
      getEmitter().emit("core-payment-document-checked-document", checkedPaymentDocument);
      return checkedPaymentDocument;
    } catch (e) {
      sails.log.error("PAYMENTDOCUMENT > doCheck error :", e);
    }
  },
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
  register: async function (
    paymentId: string,
    originModel: string,
    amount: number,
    paymentMethodId: string,
    backLinkSuccess: string,
    backLinkFail: string,
    comment: string,
    data: any
  ): Promise<PaymentResponse> {
    checkAmount(amount);
    await checkOrigin(originModel, paymentId);
    await checkPaymentMethod(paymentMethodId);
    var id: string = uuid();
    id = id.replace(/-/g, '').toUpperCase();
    let payment: Payment = {
      id: id,
      paymentId: paymentId,
      originModel: originModel,
      paymentMethod: paymentMethodId,
      amount: amount,
      comment: comment,
      data: data,
    };

    getEmitter().emit("core-payment-document-before-create", payment);
    try {
      await PaymentDocument.create(payment).fetch();
    } catch (e) {
      getEmitter().emit("error", "PaymentDocument > register:", e);
      sails.log.error("Error in paymentAdapter.createPayment :", e);
      throw {
        code: 3,
        error: "PaymentDocument not created: " + e,
      };
    }

    let paymentAdapter: PaymentAdapter = await PaymentMethod.getAdapterById(paymentMethodId);
    sails.log.debug("PaymentDocumnet > register [paymentAdapter]", paymentMethodId, paymentAdapter);
    try {
      sails.log.verbose("PaymentDocumnet > register [before paymentAdapter.createPayment]", payment, backLinkSuccess, backLinkFail);
      let paymentResponse: PaymentResponse = await paymentAdapter.createPayment(payment, backLinkSuccess, backLinkFail);

      await PaymentDocument.update(
        { id: paymentResponse.id },
        {
          status: "REGISTRED",
          externalId: paymentResponse.externalId,
          redirectLink: paymentResponse.redirectLink,
        }
      ).fetch();
      return paymentResponse;
    } catch (e) {
      getEmitter().emit("error", "PaymentDocument > register:", e);
      sails.log.error("Error in paymentAdapter.createPayment :", e);
      throw {
        code: 4,
        error: "Error in paymentAdapter.createPayment :" + e,
      };
    }
  },
  afterUpdate: async function (values: PaymentDocument, next: any) {
    sails.log.silly("PaymentDocument > afterUpdate > ", JSON.stringify(values));
    if (values.paid && values.status === "PAID") {
      try {
        if (!values.amount || !values.paymentMethod || !values.paymentId) {
          sails.log.error("PaymentDocument > afterUpdate, not have requried fields :", values);
          throw "PaymentDocument > afterUpdate, not have requried fields";
        }
        await sails.models[values.originModel].doPaid({id: values.paymentId},values);
      } catch (e) {
        sails.log.error("Error in PaymentDocument.afterUpdate :", e);
      }
    }
    next();
  },

  /** Цикл проверки платежей */
  processor: async function (timeout: number) {
    sails.log.info("PaymentDocument.processor > started with timeout: " + timeout);
    return (payment_processor_interval = setInterval(async () => {
      let actualTime = new Date();

      let actualPaymentDocuments: PaymentDocument[] = await PaymentDocument.find({ status: "REGISTRED" });

      /** Если дата создания платежногоДокумента больше чем час назад ставим статус просрочено*/
      actualTime.setHours(actualTime.getHours() - 1);
      for await (let actualPaymentDocument of actualPaymentDocuments) {
        if (actualPaymentDocument.createdAt < actualTime) {
          await PaymentDocument.update({ id: actualPaymentDocument.id }, { status: "DECLINE" }).fetch();
        } else {
          sails.log.info("PAYMENT DOCUMENT > processor actualPaymentDocuments", actualPaymentDocument.id, actualPaymentDocument.createdAt, "after:", actualTime);
          await PaymentDocument.doCheck({id: actualPaymentDocument.id}) ;
        }
      }
    }, timeout || 120000));
  },
};

module.exports = {
  primaryKey: "id",
  attributes: attributes,
  ...Model,
};

declare global {
  const PaymentDocument: typeof Model & ORMModel<PaymentDocument>;
}

////////////////////////////// LOCAL

async function checkOrigin(originModel: string, paymentId: string) {
  //@ts-ignore
  if (!(await sails.models[originModel].findOne({ id: paymentId }))) {
    throw {
      code: 1,
      error: "incorrect paymentId or originModel",
    };
  }
}

function checkAmount(amount: number) {
  if (!amount || amount <= 0) {
    throw {
      code: 2,
      error: "incorrect amount",
    };
  }
  // TODO: разобраться зачем это нужно, для сбербанка
  if (!(amount % 1 === 0)) {
    throw {
      code: 2,
      error: "incorrect amount",
    };
  }
}

async function checkPaymentMethod(paymentMethodId) {
  if (!(await PaymentMethod.checkAvailable(paymentMethodId))) {
    throw {
      code: 4,
      error: "paymentAdapter not available",
    };
  }
}
