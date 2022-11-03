"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
const getEmitter_1 = require("../libs/getEmitter");
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
var PaymentDocumentStatus;
(function (PaymentDocumentStatus) {
    PaymentDocumentStatus["NEW"] = "NEW";
    PaymentDocumentStatus["REGISTRED"] = "REGISTRED";
    PaymentDocumentStatus["PAID"] = "PAID";
    PaymentDocumentStatus["CANCEL"] = "CANCEL";
    PaymentDocumentStatus["REFUND"] = "REFUND";
    PaymentDocumentStatus["DECLINE"] = "DECLINE";
})(PaymentDocumentStatus || (PaymentDocumentStatus = {}));
let payment_processor_interval;
let attributes = {
    /** Уникальный id в моделе PaymentDocument */
    id: {
        type: "string",
    },
    /** соответсвует id из модели originModel */
    paymentId: "string",
    /** ID во внешней системе */
    externalId: "string",
    /** Модель из которой делается платеж */
    originModel: "string",
    /** Платежный метод */
    paymentMethod: {
        model: "PaymentMethod",
    },
    /** Сумма к оплате */
    amount: "number",
    /** Флаг установлен что оплата произведена */
    paid: {
        type: "boolean",
        defaultsTo: false,
    },
    status: {
        type: "string",
        isIn: ["NEW", "REGISTRED", "PAID", "CANCEL", "REFUND", "DECLINE"],
        defaultsTo: "NEW",
    },
    /** Комментари для платежной системы */
    comment: "string",
    /** ВЕРОЯТНО ТУТ ЭТО НЕ НУЖНО */
    redirectLink: "string",
    /** Текст ошибки */
    error: "string",
    data: "json"
};
let Model = {
    beforeCreate(paymentDocumentInit, next) {
        if (!paymentDocumentInit.id) {
            paymentDocumentInit.id = uuid_1.v4();
        }
        next();
    },
    doCheck: async function (criteria) {
        const self = (await PaymentDocument.find(criteria).limit(1))[0];
        if (!self)
            throw `PaymentDocument is not found`;
        getEmitter_1.default().emit("core-payment-document-check", self);
        try {
            let paymentAdapter = await PaymentMethod.getAdapterById(self.paymentMethod);
            let checkedPaymentDocument = await paymentAdapter.checkPayment(self);
            sails.log.debug("checkedPaymentDocument >> ", checkedPaymentDocument);
            if (checkedPaymentDocument.status === "PAID") {
                await PaymentDocument.update({ id: self.id }, { status: checkedPaymentDocument.status, paid: true }).fetch();
                checkedPaymentDocument.paid = true;
            }
            else {
                await PaymentDocument.update({ id: self.id }, { status: checkedPaymentDocument.status }).fetch();
            }
            getEmitter_1.default().emit("core-payment-document-checked-document", checkedPaymentDocument);
            return checkedPaymentDocument;
        }
        catch (e) {
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
    register: async function (paymentId, originModel, amount, paymentMethodId, backLinkSuccess, backLinkFail, comment, data) {
        checkAmount(amount);
        await checkOrigin(originModel, paymentId);
        await checkPaymentMethod(paymentMethodId);
        var id = uuid_1.v4();
        id = id.replace(/-/g, '').toUpperCase();
        let payment = {
            id: id,
            paymentId: paymentId,
            originModel: originModel,
            paymentMethod: paymentMethodId,
            amount: amount,
            comment: comment,
            data: data,
        };
        getEmitter_1.default().emit("core-payment-document-before-create", payment);
        try {
            await PaymentDocument.create(payment).fetch();
        }
        catch (e) {
            getEmitter_1.default().emit("error", "PaymentDocument > register:", e);
            sails.log.error("Error in paymentAdapter.createPayment :", e);
            throw {
                code: 3,
                error: "PaymentDocument not created: " + e,
            };
        }
        let paymentAdapter = await PaymentMethod.getAdapterById(paymentMethodId);
        sails.log.debug("PaymentDocumnet > register [paymentAdapter]", paymentMethodId, paymentAdapter);
        try {
            sails.log.verbose("PaymentDocumnet > register [before paymentAdapter.createPayment]", payment, backLinkSuccess, backLinkFail);
            let paymentResponse = await paymentAdapter.createPayment(payment, backLinkSuccess, backLinkFail);
            await PaymentDocument.update({ id: paymentResponse.id }, {
                status: "REGISTRED",
                externalId: paymentResponse.externalId,
                redirectLink: paymentResponse.redirectLink,
            }).fetch();
            return paymentResponse;
        }
        catch (e) {
            getEmitter_1.default().emit("error", "PaymentDocument > register:", e);
            sails.log.error("Error in paymentAdapter.createPayment :", e);
            throw {
                code: 4,
                error: "Error in paymentAdapter.createPayment :" + e,
            };
        }
    },
    afterUpdate: async function (values, next) {
        sails.log.silly("PaymentDocument > afterUpdate > ", JSON.stringify(values));
        if (values.paid && values.status === "PAID") {
            try {
                if (!values.amount || !values.paymentMethod || !values.paymentId) {
                    sails.log.error("PaymentDocument > afterUpdate, not have requried fields :", values);
                    throw "PaymentDocument > afterUpdate, not have requried fields";
                }
                await sails.models[values.originModel].doPaid({ id: values.paymentId }, values);
            }
            catch (e) {
                sails.log.error("Error in PaymentDocument.afterUpdate :", e);
            }
        }
        next();
    },
    /** Цикл проверки платежей */
    processor: async function (timeout) {
        sails.log.info("PaymentDocument.processor > started with timeout: " + timeout);
        return (payment_processor_interval = setInterval(async () => {
            let actualTime = new Date();
            let actualPaymentDocuments = await PaymentDocument.find({ status: "REGISTRED" });
            /** Если дата создания платежногоДокумента больше чем час назад ставим статус просрочено*/
            actualTime.setHours(actualTime.getHours() - 1);
            for await (let actualPaymentDocument of actualPaymentDocuments) {
                if (actualPaymentDocument.createdAt < actualTime) {
                    await PaymentDocument.update({ id: actualPaymentDocument.id }, { status: "DECLINE" }).fetch();
                }
                else {
                    sails.log.info("PAYMENT DOCUMENT > processor actualPaymentDocuments", actualPaymentDocument.id, actualPaymentDocument.createdAt, "after:", actualTime);
                    await PaymentDocument.doCheck({ id: actualPaymentDocument.id });
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
////////////////////////////// LOCAL
async function checkOrigin(originModel, paymentId) {
    //@ts-ignore
    if (!(await sails.models[originModel].findOne({ id: paymentId }))) {
        throw {
            code: 1,
            error: "incorrect paymentId or originModel",
        };
    }
}
function checkAmount(amount) {
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
