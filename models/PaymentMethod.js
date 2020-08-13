"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var alivedPaymentMethods = [];
module.exports = {
    attributes: {
        id: {
            type: 'string',
            primaryKey: true
        },
        title: 'string',
        type: {
            type: 'string',
            enum: ['promise', 'external', 'internal'],
            defaultsTo: 'promise',
            required: true
        },
        adapter: {
            type: 'string',
            unique: true,
            required: true
        },
        order: 'integer',
        description: 'string',
        enable: {
            type: 'boolean',
            defaultsTo: true,
            required: true
        }
    },
    async alive(initPaymentMethod) {
        let knownPaymentMethod = await PaymentMethod.findOne({ adapter: initPaymentMethod.adapter });
        if (!knownPaymentMethod) {
            knownPaymentMethod = await PaymentMethod.create(initPaymentMethod);
        }
        if (knownPaymentMethod.enable === true) {
            alivedPaymentMethods.push(initPaymentMethod.adapter);
        }
        return;
    },
    async getAvailable() {
        return await PaymentMethod.find({
            where: {
                or: [{
                        adapter: alivedPaymentMethods
                    },
                    {
                        type: 'promise',
                        enable: true,
                    }]
            },
            sort: 'order ASC'
        });
    },
    async checkAailable(paymentMethodId) {
        const chekingPaymentMethod = await PaymentMethod.findOne({ id: paymentMethodId });
        if (!chekingPaymentMethod) {
            return false;
        }
        if (chekingPaymentMethod.type !== 'promise' &&
            alivedPaymentMethods.indexOf(paymentMethodId) != -1) {
            return false;
        }
        if (chekingPaymentMethod.enable === true &&
            chekingPaymentMethod.type !== 'promise' &&
            alivedPaymentMethods.indexOf(paymentMethodId) >= 0) {
            return true;
        }
        if (chekingPaymentMethod.enable === true &&
            chekingPaymentMethod.type === 'promise') {
            return true;
        }
        return false;
    },
    async isPaymentPromise(paymentMethodId) {
        const chekingPaymentMethod = await PaymentMethod.findOne({ id: paymentMethodId });
        if (chekingPaymentMethod.type === 'promise') {
            return true;
        }
        return false;
    },
};
