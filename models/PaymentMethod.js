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
    /**
   * Добавляет в список возможных к использованию платежные адаптеры при старте.
   * Если  платежный метод не сушетсвует в базе то создает его
   * @param paymentMethod
   * @return
   */
    async alive(paymentMethod) {
        let knownPaymentMethod = await PaymentMethod.findOne({ adapter: paymentMethod.adapter });
        if (!knownPaymentMethod) {
            knownPaymentMethod = await PaymentMethod.create(paymentMethod);
        }
        if (knownPaymentMethod.enable === true) {
            alivedPaymentMethods.push(paymentMethod.adapter);
        }
        return;
    },
    /**
   * Возвращает массив с возможными на текущий момент способами оплаты
   * @param  нету
   * @return массив типов оплат
   */
    async paymentMethods() {
        return await PaymentMethod.find({ or: [{ adapter: alivedPaymentMethods }, { type: 'promise', enable: true }] });
    }
};
