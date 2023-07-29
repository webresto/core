"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
/** on the example of the basket (Order):
 * 1. Model Conducting Internal/External (for example: Order) creates PaymentDocument
 *
 * 2. PaymentDocument, when creating a new payment order, finds the desired payment method
 * and creates payment in the payment system (there is a redirect for a payment form)
 *
 * 3. When a person paid, depending on the logic of the work of the payment gateway.PaymentProcessor or
 * Getting a call from the payment system
 * Or we will interview the payment system until we find out the state of the payment.
 * PaymentProcessor has a timer in order to interview payment systems about the state of payment,
 * Thus, in the payment system, an additional survey does not need to be implemented, only the Check function
 *
 * 4. At the time when a person completed the work with the gateway and made payment, he will return to the page indicated
 * In the payment Adapter as a page for a successful return.It is assumed that the redirect to the page will occur
 * an order where a person can see the state of his order.During the load of this page, a call will be made
 * Controller API Getorder (/Api/0.5/order ::::
 *
 * 5. If the payment was successful, then PaymentProcessor will set the PAID status in accordance with PaymentDocument,
 * This, in turn, means that PaymentDocument will try to put the ISPAID: true in the model and make EMIT ('Core-Payment-Document-Paid', Document)
 * Corresponding Originmodel of the current PaymentDocument.(In the service with ORDER, Next ();)
 *
 * 6. In the event of a change in payment status, an EMIT ('Core-Payment-Document-Status', Document) will occur where any system can be able
 * to register for changes in status,
 *
 * 7. In the event of unsuccessful payment, the user will be returned to the page of the notification of unsuccessful payment and then there will be a redirect to the page
 * placing an order so that the user can try to pay the order again.
 */
/**
  REGISTRED - the order is registered, but not paid;
  PAID - complete authorization of the amount of the order was carried out;
  CANCEL - authorization canceled;
  REFUND - the transaction was carried out by the return operation;
  DECLINE - Authorization is rejected.
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
    /** Unique ID in PaymentDocument */
    id: {
        type: "string",
        //required: true,
    },
    /** corresponds to ID from the Origin Model model */
    paymentId: "string",
    /** ID in the external system */
    externalId: "string",
    /** Model from which payment is made*/
    originModel: "string",
    /** Payment method */
    paymentMethod: {
        model: "PaymentMethod",
    },
    /** The amount for payment*/
    amount: "number",
    /** The flag is established that payment was made*/
    paid: {
        type: "boolean",
        defaultsTo: false,
    },
    status: {
        type: "string",
        isIn: ["NEW", "REGISTRED", "PAID", "CANCEL", "REFUND", "DECLINE"],
        defaultsTo: "NEW",
    },
    /** Comments for payment system */
    comment: "string",
    /** It is probably not necessary here */
    redirectLink: "string",
    /** Error text */
    error: "string",
    data: "json"
};
let Model = {
    beforeCreate(paymentDocumentInit, cb) {
        if (!paymentDocumentInit.id) {
            paymentDocumentInit.id = (0, uuid_1.v4)();
        }
        cb();
    },
    doCheck: async function (criteria) {
        const self = (await PaymentDocument.find(criteria).limit(1))[0];
        if (!self)
            throw `PaymentDocument is not found`;
        emitter.emit("core-payment-document-check", self);
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
            emitter.emit("core-payment-document-checked-document", checkedPaymentDocument);
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
        var id = (0, uuid_1.v4)();
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
        emitter.emit("core-payment-document-before-create", payment);
        try {
            await PaymentDocument.create(payment);
        }
        catch (e) {
            emitter.emit("error", "PaymentDocument > register:", e);
            sails.log.error("Error in paymentAdapter.createPayment :", e);
            throw {
                code: 3,
                error: "PaymentDocument not created: " + e,
            };
        }
        let paymentAdapter = await PaymentMethod.getAdapterById(paymentMethodId);
        sails.log.debug("PaymentDocumnet > register [paymentAdapter]", paymentMethodId, paymentAdapter);
        try {
            sails.log.silly("PaymentDocumnet > register [before paymentAdapter.createPayment]", payment, backLinkSuccess, backLinkFail);
            let paymentResponse = await paymentAdapter.createPayment(payment, backLinkSuccess, backLinkFail);
            await PaymentDocument.update({ id: paymentResponse.id }, {
                status: PaymentDocumentStatus.REGISTRED,
                externalId: paymentResponse.externalId,
                redirectLink: paymentResponse.redirectLink,
            }).fetch();
            return paymentResponse;
        }
        catch (e) {
            emitter.emit("error", "PaymentDocument > register:", e);
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
    /** Payment check cycle*/
    processor: async function (timeout) {
        sails.log.silly("PaymentDocument.processor > started with timeout: " + timeout ?? 120000);
        return (payment_processor_interval = setInterval(async () => {
            let actualTime = new Date();
            let actualPaymentDocuments = await PaymentDocument.find({ status: PaymentDocumentStatus.REGISTRED });
            /**If the date of creation of a payment document more than an hour ago, we put the status expired */
            actualTime.setHours(actualTime.getHours() - 1);
            for await (let actualPaymentDocument of actualPaymentDocuments) {
                if (actualPaymentDocument.createdAt < actualTime) {
                    await PaymentDocument.update({ id: actualPaymentDocument.id }, { status: PaymentDocumentStatus.DECLINE }).fetch();
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
