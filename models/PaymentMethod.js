"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuid = require('uuid/v4');
var alivedPaymentMethods = [];
module.exports = {
    attributes: {
        id: {
            type: 'string',
            primaryKey: true,
            autoIncrement: true,
            defaultsTo: uuid()
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
    /**
   * Добавляет в список возможных к использованию платежные адаптеры при старте.
   * Если  платежный метод не сушетсвует в базе то создает его
   * @param paymentMethod
   * @return
   */
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
    /**
   * Возвращает массив с возможными на текущий момент способами оплаты отсортированный по order
   * @param  нету
   * @return массив типов оплат
   */
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
    /**
   * Проверяет платежную систему на доступность, и включенность,
   *  для пейментПромис систем только включенность.
   * @param paymentMethodId
   * @return
   */
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
    /**
   * Возвращает true если платежный метод является обещанием платежа
   * @param  paymentMethodId
   * @return
   */
    async isPaymentPromise(paymentMethodId) {
        const chekingPaymentMethod = await PaymentMethod.findOne({ id: paymentMethodId });
        if (chekingPaymentMethod.type === 'promise') {
            return true;
        }
        return false;
    },
};
