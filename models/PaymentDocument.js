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
    /**
    * Регистрирует новый платежный документ
    * @param paymentId - UUID Идентификатор соответсвующий записи в моделе из originModel
    * @param originModel - Модель в которой иницировалась оплата
    * @param amount -  Сумма платежа
    * @param paymentAdapter - Адаптер платежей
    * @param comment - Комментарий
    * @throws Object {
    *   body: string,
    *   error: number
    * }
    * where codes:
    * 1 - некорректный paymentId или originModel
    * 2 - amount не указан или плохой тип
    * 4 - paymentAdapter не существует или недоступен
    * 5 - произошла ошибка в выбранном paymentAdapter
    * 6 - произошла ошибка при создании платежного документа
    * @fires paymentdocument:core-payment-document-before-create - вызывается перед началом фунции. Результат подписок игнорируется.
    * @fires cart:core-cart-set-comment-reject-no-cartdish - вызывается перед ошибкой о том, что блюдо не найдено. Результат подписок игнорируется.
    * @fires cart:core-cart-after-set-comment - вызывается после успешной работы функции. Результат подписок игнорируется.
    */
    register: async function (paymentId, originModel, amount, paymentMethodId, comment) {
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
        // PAYMENT: do register
        await PaymentMethod.getAdapter(paymentMethodId);
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
