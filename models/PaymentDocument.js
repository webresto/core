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
        paymentDocument.id = uuid();
        paymentDocument.status = "NEW";
        next();
    },
    // PAYMENT payment document/ register
    register: async function (paymentId, originModel, amount, paymentMethodId, backLinkSuxess, backLinkFail, comment) {
        checkAmount(amount);
        await checkOrigin(originModel, paymentId);
        await checkPaymentMethod(paymentMethodId);
        let payment = { paymentId: paymentId, originModel: originModel, PaymentMethod: paymentMethodId, amount: amount };
        const emitter = getEmitter_1.default();
        getEmitter_1.default().emit('core-payment-document-before-create', payment);
        try {
            let paymentDocument = await PaymentDocument.create(payment);
        }
        catch (error) {
            throw {
                code: 6,
                error: 'PaymentDocument not created'
            };
        }
        let paymentAdapter = await PaymentMethod.getAdapterById(paymentMethodId);
        return await paymentAdapter.createPayment(payment, backLinkSuxess, backLinkFail);
        // PTODO: тут надо обрабоать ошибки
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
