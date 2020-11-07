"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuid = require("uuid/v4");
const getEmitter_1 = require("../lib/getEmitter");
module.exports = {
    autoPK: false,
    attributes: {
        id: {
            type: 'string',
            primaryKey: true,
            defaultsTo: function () { return uuid(); }
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
        var id = uuid();
        id = id.substr(id.length - 8).toUpperCase();
        let payment = { id: id, paymentId: paymentId, originModel: originModel, paymentMethod: paymentMethodId, amount: amount, comment: comment, data: data };
        getEmitter_1.default().emit('core-payment-document-before-create', payment);
        try {
            let paymentDocument = await PaymentDocument.create(payment);
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
        sails.log.info("PaymentDocumnet > register [paymentAdapter]", paymentMethodId, paymentAdapter);
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
        sails.log.info('PaymentDocument > afterUpdate > ', values);
        if (values.paid && values.status === 'PAID') {
            try {
                await sails.models[values.originModel].update({ id: values.paymentId }, { paid: true });
            }
            catch (e) {
                sails.log.error("Error in PaymentDocument.afterUpdate :", e);
            }
        }
        next();
    },
    /** Цикл проверки платежей */
    processor: async function (timeout) {
        setInterval(async () => {
            let actualTime = new Date();
            actualTime.setHours(actualTime.getHours() - 1);
            let actualPaymentDocuments = await PaymentDocument.find({ status: "REGISTRED", createdAt: { '>=': actualTime } });
            for await (let actualPaymentDocument of actualPaymentDocuments) {
                await actualPaymentDocument.doCheck();
            }
        }, timeout || 120000);
    }
};
async function checkOrigin(originModel, paymentId) {
    //@ts-ignore
    if (!await sails.models[originModel].findOne(paymentId)) {
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
