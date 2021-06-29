"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
const getEmitter_1 = require("../lib/getEmitter");
let payment_processor_interval;
module.exports = {
    autoPK: false,
    attributes: {
        id: {
            type: 'string',
            primaryKey: true,
            defaultsTo: function () { return uuid_1.v4(); }
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
            type: 'string',
            enum: ['NEW', 'REGISTRED', 'PAID', 'CANCEL', 'REFUND', 'DECLINE'],
            defaultsTo: 'NEW'
        },
        comment: 'string',
        redirectLink: 'string',
        error: 'string',
        doPaid: async function () {
            const self = this;
            if (self.status === "PAID" && self.paid !== true) {
                self.status = "PAID";
                self.paid = true;
                getEmitter_1.default().emit('core-payment-document-paid', self);
                await self.save();
            }
            return self;
        },
        doCheck: async function () {
            const self = this;
            getEmitter_1.default().emit('core-payment-document-check', self);
            try {
                let paymentAdapter = await PaymentMethod.getAdapterById(self.paymentMethod);
                let checkedPaymentDocument = await paymentAdapter.checkPayment(self);
                if (checkedPaymentDocument.status === "PAID" && checkedPaymentDocument.paid !== true) {
                    await checkedPaymentDocument.doPaid();
                }
                else {
                    await PaymentDocument.update({ id: self.id }, { status: checkedPaymentDocument.status });
                }
                getEmitter_1.default().emit('core-payment-document-checked-document', checkedPaymentDocument);
                return checkedPaymentDocument;
            }
            catch (e) {
                sails.log.error("PAYMENTDOCUMENT > doCheck error :", e);
            }
        },
    },
    register: async function (paymentId, originModel, amount, paymentMethodId, backLinkSuccess, backLinkFail, comment, data) {
        checkAmount(amount);
        await checkOrigin(originModel, paymentId);
        await checkPaymentMethod(paymentMethodId);
        var id = uuid_1.v4();
        id = id.substr(id.length - 8).toUpperCase();
        let payment = { id: id, paymentId: paymentId, originModel: originModel, paymentMethod: paymentMethodId, amount: amount, comment: comment, data: data };
        getEmitter_1.default().emit('core-payment-document-before-create', payment);
        try {
            await PaymentDocument.create(payment);
        }
        catch (e) {
            getEmitter_1.default().emit('error', "PaymentDocument > register:", e);
            sails.log.error("Error in paymentAdapter.createPayment :", e);
            throw {
                code: 3,
                error: 'PaymentDocument not created: ' + e
            };
        }
        let paymentAdapter = await PaymentMethod.getAdapterById(paymentMethodId);
        sails.log.debug("PaymentDocumnet > register [paymentAdapter]", paymentMethodId, paymentAdapter);
        try {
            sails.log.verbose("PaymentDocumnet > register [before paymentAdapter.createPayment]", payment, backLinkSuccess, backLinkFail);
            let paymentResponse = await paymentAdapter.createPayment(payment, backLinkSuccess, backLinkFail);
            await PaymentDocument.update({ id: paymentResponse.id }, {
                status: 'REGISTRED',
                externalId: paymentResponse.externalId,
                redirectLink: paymentResponse.redirectLink
            });
            return paymentResponse;
        }
        catch (e) {
            getEmitter_1.default().emit('error', "PaymentDocument > register:", e);
            sails.log.error("Error in paymentAdapter.createPayment :", e);
            throw {
                code: 4,
                error: 'Error in paymentAdapter.createPayment :' + e
            };
        }
    },
    afterUpdate: async function (values, next) {
        sails.log.silly('PaymentDocument > afterUpdate > ', JSON.stringify(values));
        if (values.paid && values.status === 'PAID') {
            try {
                if (!values.amount || !values.paymentMethod || !values.paymentId) {
                    sails.log.error("PaymentDocument > afterUpdate, not have requried fields :", values);
                    throw "PaymentDocument > afterUpdate, not have requried fields";
                }
                await sails.models[values.originModel].doPaid(values);
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
        return payment_processor_interval = setInterval(async () => {
            let actualTime = new Date();
            let actualPaymentDocuments = await PaymentDocument.find({ status: "REGISTRED" });
            /** Если дата создания платежногоДокумента больше чем час назад ставим статус просрочено*/
            actualTime.setHours(actualTime.getHours() - 1);
            for await (let actualPaymentDocument of actualPaymentDocuments) {
                if (actualPaymentDocument.createdAt < actualTime) {
                    await PaymentDocument.update({ id: actualPaymentDocument.id }, { status: "DECLINE" });
                }
                else {
                    sails.log.info("PAYMENT DOCUMENT > processor actualPaymentDocuments", actualPaymentDocument.id, actualPaymentDocument.createdAt, "after:", actualTime);
                    await actualPaymentDocument.doCheck();
                }
            }
        }, timeout || 15000);
    }
};
async function checkOrigin(originModel, paymentId) {
    //@ts-ignore
    if (!await sails.models[originModel].findOne({ id: paymentId })) {
        throw {
            code: 1,
            error: 'incorrect paymentId or originModel'
        };
    }
}
function checkAmount(amount) {
    if (!amount || amount <= 0) {
        throw {
            code: 2,
            error: 'incorrect amount'
        };
    }
    if (!(amount % 1 === 0)) {
        throw {
            code: 2,
            error: 'incorrect amount'
        };
    }
}
async function checkPaymentMethod(paymentMethodId) {
    if (!await PaymentMethod.checkAvailable(paymentMethodId)) {
        throw {
            code: 4,
            error: 'paymentAdapter not available'
        };
    }
}
