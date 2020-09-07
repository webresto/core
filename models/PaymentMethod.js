"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuid = require("uuid/v4");
var alivedPaymentMethods = {};
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
        },
        /**
       * Возвращает инстанс платежного адаптера по известному названию адаптера
       * @param  paymentMethodId
       * @return
       */
        async getAdapter(adapter) {
            var paymentMethod;
            if (!adapter) {
                paymentMethod = this;
            }
            else {
                paymentMethod = await PaymentMethod.findOne({ adapter: adapter });
            }
            //@ts-ignore 
            if (paymentMethod.isPaymentPromise()) {
                return undefined;
            }
            if (alivedPaymentMethods[paymentMethod.adapter] !== undefined) {
                return alivedPaymentMethods[paymentMethod.adapter];
            }
            else {
                return undefined;
            }
        }
    },
    beforeCreate: function (paymentMethod, next) {
        paymentMethod.id = uuid();
        next();
    },
    /**
     * Возвращает true если платежный метод является обещанием платежа
     * @param  paymentMethodId
     * @return
     */
    async isPaymentPromise(paymentMethodId) {
        var chekingPaymentMethod;
        if (!paymentMethodId) {
            chekingPaymentMethod = this;
        }
        else {
            chekingPaymentMethod = await PaymentMethod.findOne({ id: paymentMethodId });
        }
        if (chekingPaymentMethod.type === 'promise') {
            return true;
        }
        return false;
    },
    /**
   * Добавляет в список возможных к использованию платежные адаптеры при их старте.
   * Если  платежный метод не сушетсвует в базе то создает его
   * @param paymentMethod
   * @return
   */
    async alive(paymentAdapter) {
        let knownPaymentMethod = await PaymentMethod.findOne({ adapter: paymentAdapter.InitPaymentAdapter.adapter });
        if (!knownPaymentMethod) {
            knownPaymentMethod = await PaymentMethod.create(paymentAdapter.InitPaymentAdapter);
        }
        if (knownPaymentMethod.enable === true) {
            alivedPaymentMethods[paymentAdapter.InitPaymentAdapter.adapter] = paymentAdapter;
        }
        sails.log.info("PaymentMethod > alive", knownPaymentMethod, alivedPaymentMethods[paymentAdapter.InitPaymentAdapter.adapter]);
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
                        adapter: Object.keys(alivedPaymentMethods)
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
    async checkAvailable(paymentMethodId) {
        const chekingPaymentMethod = await PaymentMethod.findOne({ id: paymentMethodId });
        if (!chekingPaymentMethod) {
            return false;
        }
        if (chekingPaymentMethod.type !== 'promise' &&
            alivedPaymentMethods[chekingPaymentMethod.adapter] === undefined) {
            return false;
        }
        if (chekingPaymentMethod.enable === true &&
            chekingPaymentMethod.type !== 'promise' &&
            alivedPaymentMethods[chekingPaymentMethod.adapter] !== undefined) {
            return true;
        }
        if (chekingPaymentMethod.enable === true &&
            chekingPaymentMethod.type === 'promise') {
            return true;
        }
        return false;
    },
    /**
   * Возвращает инстанс платежного адаптера по известному ID PaymentMethod
   * @param  paymentMethodId
   * @return PaymentAdapter
   * @throws
   */
    async getAdapterById(paymentMethodId) {
        const paymentMethod = await PaymentMethod.findOne({ id: paymentMethodId });
        //@ts-ignore 
        if (await PaymentMethod.isPaymentPromise(paymentMethod.id)) {
            return undefined;
        }
        if (alivedPaymentMethods[paymentMethod.adapter]) {
            sails.log.verbose("Core > PaymentMethod > getAdapterById", alivedPaymentMethods[paymentMethod.adapter]);
            return alivedPaymentMethods[paymentMethod.adapter];
        }
        else {
            console.log("undefined,undefined");
            return undefined;
        }
    },
};
