"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var alivedPaymentMethods = [];
module.exports = {
    attributes: {
        id: {
            type: 'string',
            primaryKey: true,
            autoIncrement: true
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
    async paymentMethods() {
        return await PaymentMethod.find({ or: [{ adapter: alivedPaymentMethods }, { type: 'promise', enable: true }] });
    }
};
