"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
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
                status: "REGISTRED",
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
            let actualPaymentDocuments = await PaymentDocument.find({ status: "REGISTRED" });
            /**If the date of creation of a payment document more than an hour ago, we put the status expired */
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
