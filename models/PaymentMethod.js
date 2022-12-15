"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
var alivedPaymentMethods = {};
let attributes = {
    /** ID платежного метода */
    id: {
        type: "string",
        //required: true,
    },
    /** Название платежного метода */
    title: "string",
    /**
     * Типы платежей, internal - внутренние (когда не требуется запрос во внешнюю систему)
     * external - Когда надо ожидать подтверждение платежа во внешней системе
     * promise - Типы оплат при получении
     */
    type: {
        type: "string",
        isIn: ["internal", "external", "promise", "dummy"],
        required: true,
    },
    isCash: {
        type: "boolean"
    },
    adapter: {
        type: "string",
        unique: true,
        required: true,
    },
    order: "number",
    description: "string",
    enable: {
        type: "boolean",
        required: true,
    },
};
let Model = {
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
        if (PaymentMethod.isPaymentPromise(paymentMethod.id)) {
            return undefined;
        }
        if (alivedPaymentMethods[paymentMethod.adapter] !== undefined) {
            return alivedPaymentMethods[paymentMethod.adapter];
        }
        else {
            return undefined;
        }
    },
    beforeCreate: function (paymentMethod, next) {
        if (!paymentMethod.id) {
            paymentMethod.id = (0, uuid_1.v4)();
        }
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
            chekingPaymentMethod = await PaymentMethod.findOne({
                id: paymentMethodId,
            });
        }
        if (chekingPaymentMethod.type === "promise") {
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
        let knownPaymentMethod = await PaymentMethod.findOne({
            adapter: paymentAdapter.InitPaymentAdapter.adapter,
        });
        if (!knownPaymentMethod) {
            knownPaymentMethod = await PaymentMethod.create({ ...paymentAdapter.InitPaymentAdapter, enable: false }).fetch();
        }
        alivedPaymentMethods[paymentAdapter.InitPaymentAdapter.adapter] = paymentAdapter;
        sails.log.verbose("PaymentMethod > alive", knownPaymentMethod, alivedPaymentMethods[paymentAdapter.InitPaymentAdapter.adapter]);
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
                or: [
                    {
                        adapter: Object.keys(alivedPaymentMethods),
                        enable: true,
                    },
                    {
                        type: ["promise", "dummy"],
                        enable: true,
                    },
                ],
            },
            sort: "order ASC",
        });
    },
    /**
     * Проверяет платежную систему на доступность, и включенность,
     *  для пейментПромис систем только включенность.
     * @param paymentMethodId
     * @return
     */
    async checkAvailable(paymentMethodId) {
        const chekingPaymentMethod = await PaymentMethod.findOne({
            id: paymentMethodId,
        });
        const noAdapterTypes = ["promise", "dummy"];
        if (!chekingPaymentMethod) {
            return false;
        }
        if (!noAdapterTypes.includes(chekingPaymentMethod.type) && alivedPaymentMethods[chekingPaymentMethod.adapter] === undefined) {
            return false;
        }
        if (chekingPaymentMethod.enable === true && !noAdapterTypes.includes(chekingPaymentMethod.type) && alivedPaymentMethods[chekingPaymentMethod.adapter] !== undefined) {
            return true;
        }
        if (chekingPaymentMethod.enable === true && noAdapterTypes.includes(chekingPaymentMethod.type)) {
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
        if (await PaymentMethod.isPaymentPromise(paymentMethod.id)) {
            throw `PaymentPromise adapter: (${paymentMethod.adapter}) not have adapter`;
        }
        if (alivedPaymentMethods[paymentMethod.adapter]) {
            sails.log.verbose("Core > PaymentMethod > getAdapterById", alivedPaymentMethods[paymentMethod.adapter]);
            return alivedPaymentMethods[paymentMethod.adapter];
        }
        else {
            throw `${paymentMethod.adapter} is not alived`;
        }
    },
};
module.exports = {
    primaryKey: "id",
    attributes: attributes,
    ...Model,
};
