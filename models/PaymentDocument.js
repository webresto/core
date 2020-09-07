"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuid = require("uuid/v4");
const getEmitter_1 = require("../lib/getEmitter");
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
            type: 'string',
            enum: ['NEW', 'REGISTRED', 'PAID', 'CANCEL', 'REFUND', 'DECLINE']
        },
        comment: 'string',
        redirectLink: 'string',
        error: 'string',
    },
    beforeCreate: function (paymentDocument, next) {
        if (!paymentDocument.id) {
            let id = uuid();
            paymentDocument.id = id.substr(id.length - 8).toUpperCase();
        }
        paymentDocument.status = "NEW";
        next();
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
