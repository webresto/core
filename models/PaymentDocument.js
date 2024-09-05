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
    originModelId: "string",
    /** ID in the external system */
    externalId: {
        type: "string",
        unique: true,
        required: false,
        allowNull: true // Only for NEW state
    },
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
        isIn: ["NEW", "REGISTERED", "PAID", "CANCEL", "REFUND", "DECLINE"],
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
        emitter.emit("core:payment-document-check", self);
        try {
            let paymentAdapter = await PaymentMethod.getAdapterById(self.paymentMethod);
            let checkedPaymentDocument = await paymentAdapter.checkPayment(self);
            sails.log.silly("checkedPaymentDocument >> ", checkedPaymentDocument);
            if (checkedPaymentDocument.status === "PAID") {
                await PaymentDocument.update({ id: self.id }, { status: checkedPaymentDocument.status, paid: true }).fetch();
                checkedPaymentDocument.paid = true;
            }
            else {
                await PaymentDocument.update({ id: self.id }, { status: checkedPaymentDocument.status }).fetch();
            }
            emitter.emit("core:payment-document-checked-document", checkedPaymentDocument);
            return checkedPaymentDocument;
        }
        catch (e) {
            sails.log.error("PAYMENTDOCUMENT > doCheck error :", e);
        }
    },
    register: async function (originModelId, originModel, amount, paymentMethodId, backLinkSuccess, backLinkFail, comment, data) {
        checkAmount(amount);
        await checkOrigin(originModel, originModelId);
        await checkPaymentMethod(paymentMethodId);
        let id = (0, uuid_1.v4)();
        id = id.replace(/-/g, '').toUpperCase();
        let payment = {
            id: id,
            originModelId: originModelId,
            originModel: originModel,
            paymentMethod: paymentMethodId,
            amount: amount,
            comment: comment,
            data: data,
        };
        emitter.emit("core:payment-document-before-create", payment);
        try {
            await PaymentDocument.create(payment).fetch();
        }
        catch (e) {
            sails.log.error("Error in paymentAdapter.createPayment :", e);
            throw {
                code: 3,
                error: "PaymentDocument not created: " + e,
            };
        }
        let paymentAdapter = await PaymentMethod.getAdapterById(paymentMethodId);
        sails.log.debug("PaymentDocument > register [paymentAdapter]", paymentMethodId, paymentAdapter);
        try {
            sails.log.silly("PaymentDocument > register [before paymentAdapter.createPayment]", payment, backLinkSuccess, backLinkFail);
            let paymentResponse = await paymentAdapter.createPayment(payment, backLinkSuccess, backLinkFail);
            sails.log.silly("PaymentDocument > register [after paymentAdapter.createPayment]", paymentResponse);
            if (!paymentResponse.id) {
                throw `PaymentDocument > register [after paymentAdapter.createPayment] paymentResponse.id from external payment system is required`;
            }
            if (!paymentResponse.redirectLink) {
                throw `PaymentDocument > register [after paymentAdapter.createPayment] paymentResponse.redirectLink from external payment system is required`;
            }
            await PaymentDocument.update({ id: paymentResponse.id }, {
                status: "REGISTERED",
                externalId: paymentResponse.externalId,
                redirectLink: paymentResponse.redirectLink,
            }).fetch();
            return paymentResponse;
        }
        catch (e) {
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
                if (!values.amount || !values.paymentMethod || !values.originModelId) {
                    sails.log.error("PaymentDocument > afterUpdate, not have required fields :", values);
                    throw "PaymentDocument > afterUpdate, not have required fields";
                }
                await sails.models[values.originModel].doPaid({ id: values.originModelId }, values);
            }
            catch (e) {
                sails.log.error("Error in PaymentDocument.afterUpdate :", e);
            }
        }
        next();
    },
    /** Payment check cycle*/
    processor: async function (timeout) {
        sails.log.silly("PaymentDocument.processor > started with timeout: " + (timeout ?? 45000));
        return (payment_processor_interval = setInterval(async () => {
            let actualTime = new Date();
            let actualPaymentDocuments = await PaymentDocument.find({ status: "REGISTERED" });
            /**If the date of creation of a payment document more than an hour ago, we put the status expired */
            actualTime.setHours(actualTime.getHours() - 1);
            for await (let actualPaymentDocument of actualPaymentDocuments) {
                if (actualPaymentDocument.createdAt < actualTime) {
                    await PaymentDocument.update({ id: actualPaymentDocument.id }, { status: "DECLINE" }).fetch();
                }
                else {
                    sails.log.silly("PAYMENT DOCUMENT > processor actualPaymentDocuments", actualPaymentDocument.id, actualPaymentDocument.createdAt, "after:", actualTime);
                    await PaymentDocument.doCheck({ id: actualPaymentDocument.id });
                }
            }
        }, timeout || 45000));
    },
};
module.exports = {
    primaryKey: "id",
    attributes: attributes,
    ...Model,
};
////////////////////////////// LOCAL
async function checkOrigin(originModel, originModelId) {
    if (!(await sails.models[originModel].findOne({ id: originModelId }))) {
        throw {
            code: 1,
            error: "incorrect originModelId or originModel",
        };
    }
}
function checkAmount(amount) {
    if (!amount || amount <= 0) {
        sails.log.debug(`checkAmount (!amount || amount <= 0) ${amount}`);
        throw {
            code: 2,
            error: "incorrect amount",
        };
    }
    // if (!(amount % 1 === 0)) {
    //   sails.log.debug(`checkAmount (!(amount % 1 === 0)) ${amount}`)
    //   throw {
    //     code: 2,
    //     error: "incorrect amount",
    //   };
    // }
}
async function checkPaymentMethod(paymentMethodId) {
    if (!(await PaymentMethod.checkAvailable(paymentMethodId))) {
        throw {
            code: 4,
            error: "paymentAdapter not available",
        };
    }
}
