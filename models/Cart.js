"use strict";
/**
 * @api {API} Cart Cart
 * @apiGroup Models
 * @apiDescription Модель корзины. Имеет в себе список блюд, данные про них, методы для добавления/удаления блюд
 *
 * @apiParam {Integer} id Уникальный идентификатор
 * @apiParam {String} cartId ID корзины, по которой к ней обращается внешнее апи
 * @apiParam {[CartDish](#api-Models-ApiCartdish)[]} dishes Массив блюд в текущей корзине. Смотри [CartDish](#api-Models-ApiCartdish)
 * @apiParam {[PaymentMethod](#api-Models-PaymentMethod)[]} paymentMethod Способ оплаты
 * @apiParam {Boolean} paids Признак того что корзина оплачена
 * @apiParam {Integer} countDishes Общее количество блюд в корзине (с модификаторами)
 * @apiParam {Integer} uniqueDishes Количество уникальных блюд в корзине
 * @apiParam {Integer} cartTotal Стоимость корзины без доставки
 * @apiParam {Integer} total Стоимость корзины с доставкой
 * @apiParam {Float} delivery Стоимость доставки
 * @apiParam {Boolean} problem Есть ли проблема с отправкой на IIKO
 * @apiParam {JSON} customer Данные о заказчике
 * @apiParam {JSON} address Данные о адресе доставки
 * @apiParam {String} comment Комментарий к заказу
 * @apiParam {String} personsCount Количество персон
 * @apiParam {Boolean} sendToIiko Был ли отправлен заказ IIKO
 * @apiParam {String} rmsId ID заказа, который пришёл от IIKO
 * @apiParam {String} deliveryStatus Статус состояния доставки (0 успешно расчитана)
 * @apiParam {Boolean} selfService Признак самовывоза
 * @apiParam {String} deliveryDescription Строка дополнительной информации о доставке
 * @apiParam {String} message Сообщение, что отправляется с корзиной
 */
Object.defineProperty(exports, "__esModule", { value: true });
const checkExpression_1 = require("../lib/checkExpression");
const actions_1 = require("../lib/actions");
const getEmitter_1 = require("../lib/getEmitter");
const _ = require("lodash");
const moment = require("moment");
const uuid = require("uuid/v4");
module.exports = {
    autoPK: false,
    attributes: {
        id: {
            type: 'string',
            primaryKey: true,
            defaultsTo: function () { return uuid(); }
        },
        cartId: 'string',
        shortId: {
            type: 'string',
            defaultsTo: function () { return this.id.substr(this.id.length - 8).toUpperCase(); },
        },
        dishes: {
            collection: 'CartDish',
            via: 'cart'
        },
        paymentMethod: {
            model: 'PaymentMethod',
            via: 'id'
        },
        paymentMethodTitle: 'string',
        paid: {
            type: 'boolean',
            defaultsTo: false
        },
        isPaymentPromise: {
            type: 'boolean',
            defaultsTo: true
        },
        dishesCount: 'integer',
        uniqueDishes: 'integer',
        modifiers: 'json',
        customer: 'json',
        address: 'json',
        comment: 'string',
        personsCount: 'string',
        date: 'string',
        problem: {
            type: 'boolean',
            defaultsTo: false
        },
        rmsDelivered: {
            type: 'boolean',
            defaultsTo: false
        },
        rmsId: 'string',
        rmsOrderNumber: 'string',
        rmsOrderData: 'json',
        rmsDeliveryDate: 'string',
        rmsErrorMessage: 'string',
        rmsErrorCode: 'string',
        rmsStatusCode: 'string',
        deliveryStatus: 'string',
        selfService: {
            type: 'boolean',
            defaultsTo: false
        },
        deliveryDescription: {
            type: 'string',
            defaultsTo: ""
        },
        message: 'string',
        deliveryItem: 'string',
        deliveryCost: 'float',
        totalWeight: 'float',
        total: 'float',
        orderTotal: 'float',
        cartTotal: 'float',
        orderDate: 'datetime',
        /**
         * Добавление блюда в текущую корзину, указывая количество, модификаторы, комментарий и откуда было добавлено блюдо.
         * Если количество блюд ограничено и требуется больше блюд, нежели присутствует, то сгенерировано исключение.
         * Переводит корзину в состояние CART, если она ещё не в нём.
         * @param dish - Блюдо для добавления, может быть объект или id блюда
         * @param amount - количетво
         * @param modifiers - модификаторы, которые следует применить к текущему блюду
         * @param comment - комментарий к блюду
         * @param from - указатель откуда было добавлено блюдо (например, от пользователя или от системы акций)
         * @throws Object {
         *   body: string,
         *   code: number
         * }
         * where codes:
         *  1 - не достаточно блюд
         *  2 - заданное блюдо не найдено
         * @fires cart:core-cart-before-add-dish - вызывается перед началом функции. Результат подписок игнорируется.
         * @fires cart:core-cart-add-dish-reject-amount - вызывается перед ошибкой о недостатке блюд. Результат подписок игнорируется.
         * @fires cart:core-cart-add-dish-before-create-cartdish - вызывается, если все проверки прошли успешно и корзина намеряна
         * добавить блюдо. Результат подписок игнорируется.
         * @fires cart:core-cart-after-add-dish - вызывается после успешного добавления блюда. Результат подписок игнорируется.
         */
        addDish: async function (dish, amount, modifiers, comment, from, replace, cartDishId) {
            const emitter = getEmitter_1.default();
            await emitter.emit.apply(emitter, ['core-cart-before-add-dish', ...arguments]);
            let dishObj;
            if (typeof dish === "string") {
                dishObj = await Dish.findOne(dish);
                if (!dishObj) {
                    throw { body: `Dish with id ${dish} not found`, code: 2 };
                }
            }
            else {
                dishObj = dish;
            }
            if (dishObj.balance !== -1)
                if (amount > dishObj.balance) {
                    await emitter.emit.apply(emitter, ['core-cart-add-dish-reject-amount', ...arguments]);
                    throw { body: `There is no so mush dishes with id ${dishObj.id}`, code: 1 };
                }
            const cart = await Cart.findOne({ id: this.id }).populate('dishes');
            if (modifiers && modifiers.length) {
                modifiers.forEach((m) => {
                    if (!m.amount)
                        m.amount = 1;
                });
            }
            await emitter.emit.apply(emitter, ['core-cart-add-dish-before-create-cartdish', ...arguments]);
            let cartDish;
            if (replace) {
                cartDish = (await CartDish.update({ id: cartDishId }, {
                    dish: dishObj.id,
                    cart: this.id,
                    amount: amount,
                    modifiers: modifiers || [],
                    comment: comment,
                    addedBy: from
                }))[0];
            }
            else {
                cartDish = await CartDish.create({
                    dish: dishObj.id,
                    cart: this.id,
                    amount: amount,
                    modifiers: modifiers || [],
                    comment: comment,
                    addedBy: from
                });
            }
            await cart.next('CART');
            await emitter.emit.apply(emitter, ['core-cart-after-add-dish', cartDish, ...arguments]);
        },
        /**
         * Уменьшает количество заданного блюда на amount. Переводит корзину в состояние CART.
         * @param dish - Блюдо для изменения количества, dish_id {number} или dish_id {string}  если выбран режим стек.
         * @param amount - насколько меньше сделать количество (не работает в режиме стека)
         * @param stack  - Признак того что удаление блюд происходит в обратном хронологическом порядке (удаляет только по одному).
         * @throws Object {
         *   body: string,
         *   code: number
         * }
         * where codes:
         *  1 - заданный CartDish не найден в текущей корзине
         *  @fires cart:core-cart-before-remove-dish - вызывается перед началом фунции. Результат подписок игнорируется.
         *  @fires cart:core-cart-remove-dish-reject-no-cartdish - вызывается, если dish не найден в текущей корзине. Результат подписок игнорируется.
         *  @fires cart:core-cart-after-remove-dish - вызывается после успешной работы функции. Результат подписок игнорируется.
         */
        removeDish: async function (dish, amount, stack) {
            const emitter = getEmitter_1.default();
            await emitter.emit.apply(emitter, ['core-cart-before-remove-dish', ...arguments]);
            const cart = await Cart.findOne({ id: this.id }).populate('dishes');
            var cartDish;
            if (stack) {
                amount = 1;
                cartDish = await CartDish.findOne({ where: { cart: cart.id, dish: dish.id }, sort: 'createdAt ASC' }).populate('dish');
            }
            else {
                cartDish = await CartDish.findOne({ cart: cart.id, id: dish.id }).populate('dish');
            }
            if (!cartDish) {
                await emitter.emit.apply(emitter, ['core-cart-remove-dish-reject-no-cartdish', ...arguments]);
                throw { body: `CartDish with id ${dish.id} in cart with id ${this.id} not found`, code: 1 };
            }
            const get = cartDish;
            get.amount -= amount;
            if (get.amount > 0) {
                await CartDish.update({ id: get.id }, { amount: get.amount });
            }
            else {
                get.destroy();
            }
            await cart.next('CART');
            await emitter.emit.apply(emitter, ['core-cart-after-remove-dish', ...arguments]);
        },
        /**
         * Устанавливает заданное количество для заданного блюда в текущей корзине. Если количество меньше 0, то блюдо будет
         * удалено из корзины.
         * @param dish - какому блюду измениять количество
         * @param amount - новое количество
         * @throws Object {
         *   body: string,
         *   code: number
         * }
         * where codes:
         *  1 - нет такого количества блюд
         *  2 - заданный CartDish не найден
         * @fires cart:core-cart-before-set-count - вызывается перед началом фунции. Результат подписок игнорируется.
         * @fires cart:core-cart-set-count-reject-amount - вызывается перед ошибкой о недостатке блюд. Результат подписок игнорируется.
         * @fires cart:core-cart-after-set-count - вызывается после успешной работы функции. Результат подписок игнорируется.
         * @fires cart:core-cart-set-count-reject-no-cartdish - вызывается, если dish не найден в текущей корзине. Результат подписок игнорируется.
         */
        setCount: async function (dish, amount) {
            const emitter = getEmitter_1.default();
            await emitter.emit.apply(emitter, ['core-cart-before-set-count', ...arguments]);
            if (dish.dish.balance !== -1)
                if (amount > dish.dish.balance) {
                    await emitter.emit.apply(emitter, ['core-cart-set-count-reject-amount', ...arguments]);
                    throw { body: `There is no so mush dishes with id ${dish.dish.id}`, code: 1 };
                }
            const cart = await Cart.findOne(this.id).populate('dishes');
            const cartDishes = await CartDish.find({ cart: cart.id }).populate('dish');
            const get = cartDishes.find(item => item.id === dish.id);
            if (get) {
                get.amount = amount;
                if (get.amount > 0) {
                    await CartDish.update({ id: get.id }, { amount: get.amount });
                }
                else {
                    get.destroy();
                    sails.log.info('destroy', get.id);
                }
                await cart.next('CART');
                await emitter.emit.apply(emitter, ['core-cart-after-set-count', ...arguments]);
            }
            else {
                await emitter.emit.apply(emitter, ['core-cart-set-count-reject-no-cartdish', ...arguments]);
                throw { body: `CartDish dish id ${dish.id} not found`, code: 2 };
            }
        },
        /**
         * Устанавливает заданному модификатору в заданом блюде в текузей заданное количество.
         * В случае успешной работы изменяет состояние корзины в CART
         * @param dish - блюдо, модификатор которого изменять
         * @param modifier - id блюда, которое привязано к модификатору, количество которого менять
         * @param amount - новое количество
         * @throws Object {
         *   body: string,
         *   code: number
         * }
         * where codes:
         * 1 - нет достаточного количества блюд
         * 2 - dish не найден в текущей корзине
         * 3 - блюдо modifier не найден как модификатор блюда dish
         * 4 - блюдо dish в текущей корзине не содержит модификатора modifier
         * @fires cart:core-cart-before-set-modifier-count - вызывается перед началом фунции. Результат подписок игнорируется.
         * @fires cart:core-cart-set-modifier-count-reject-amount - вызывается перед ошибкой о недостатке блюд. Результат подписок игнорируется.
         * @fires cart:core-cart-set-modifier-count-reject-no-cartdish - вызывается перед ошибкой с кодом 2. Результат подписок игнорируется.
         * @fires cart:core-cart-set-modifier-count-reject-no-modifier-dish - вызывается перед ошибкой с кодом 3. Результат подписок игнорируется.
         * @fires cart:core-cart-set-modifier-count-reject-no-modifier-in-dish - вызывается перед ошибкой с кодом 4. Результат подписок игнорируется.
         * @fires cart:core-cart-after-set-modifier-count - вызывается после успешной работы функции. Результат подписок игнорируется.
         */
        setModifierCount: async function (dish, modifier, amount) {
            const emitter = getEmitter_1.default();
            await emitter.emit.apply(emitter, ['core-cart-before-set-modifier-count', ...arguments]);
            if (modifier.balance !== -1)
                if (amount > modifier.balance) {
                    await emitter.emit.apply(emitter, ['core-cart-set-modifier-count-reject-amount', ...arguments]);
                    throw { body: `There is no so mush dishes with id ${modifier.id}`, code: 1 };
                }
            const cartDishes = await CartDish.find({ cart: this.id }).populate('dish').populate('modifiers');
            const get = cartDishes.filter(item => item.dish.id === dish.id)[0];
            if (!get) {
                await emitter.emit.apply(emitter, ['core-cart-set-modifier-count-reject-no-cartdish', ...arguments]);
                throw { body: `CartDish dish id ${dish.id} not found`, code: 2 };
            }
            const dish1 = await Dish.findOne({ id: dish.id });
            // check that dish has this modifier
            const getModif = dish1.modifiers.find(item => item.id === modifier.id);
            if (!getModif) {
                await emitter.emit.apply(emitter, ['core-cart-set-modifier-count-reject-no-modifier-dish', ...arguments]);
                throw { body: `Dish dish id ${getModif.id} not found`, code: 3 };
            }
            let getMofifFromDish = get.modifiers.filter(item => modifier.id === item.dish.id)[0];
            if (!getMofifFromDish) {
                await emitter.emit.apply(emitter, ['core-cart-set-modifier-count-reject-no-modifier-in-dish', ...arguments]);
                throw { body: `Modifier ${modifier.id} in dish id ${dish.id} not found`, code: 4 };
            }
            getMofifFromDish.amount = amount;
            await CartDish.update({ id: getMofifFromDish.id }, { amount: getMofifFromDish.amount });
            await this.next('CART');
            await emitter.emit.apply(emitter, ['core-cart-after-set-modifier-count', ...arguments]);
        },
        /**
         * Меняет комментарий заданного блюда в текущей корзине
         * @param dish - какому блюду менять комментарий
         * @param comment - новый комментарий
         * @throws Object {
         *   body: string,
         *   error: number
         * }
         * where codes:
         * 1 - блюдо dish не найдено в текущей корзине
         * @fires cart:core-cart-before-set-comment - вызывается перед началом фунции. Результат подписок игнорируется.
         * @fires cart:core-cart-set-comment-reject-no-cartdish - вызывается перед ошибкой о том, что блюдо не найдено. Результат подписок игнорируется.
         * @fires cart:core-cart-after-set-comment - вызывается после успешной работы функции. Результат подписок игнорируется.
         */
        setComment: async function (dish, comment) {
            const emitter = getEmitter_1.default();
            const self = this;
            await emitter.emit.apply(emitter, ['core-cart-before-set-comment', ...arguments]);
            const cart = await Cart.findOne(this.id).populate('dishes');
            const cartDish = await CartDish.findOne({ cart: cart.id, id: dish.id }).populate('dish');
            if (cartDish) {
                await CartDish.update(cartDish.id, { comment: comment });
                await cart.next('CART');
                await Cart.countCart(self);
                await emitter.emit.apply(emitter, ['core-cart-after-set-comment', ...arguments]);
            }
            else {
                await emitter.emit.apply(emitter, ['core-cart-set-comment-reject-no-cartdish', ...arguments]);
                throw { body: `CartDish with id ${dish.id} not found`, code: 1 };
            }
        },
        /**
         * Set cart selfService field. Use this method to change selfService.
         * @param selfService
         */
        setSelfService: async function (selfService) {
            const self = this;
            sails.log.verbose('Cart > setSelfService >', selfService);
            await actions_1.default.reset(this);
            self.selfService = selfService;
            await self.save();
        },
        /**
         * Проверяет ваидность customer. Проверка проходит на наличие полей и их валидность соответсвенно nameRegex и phoneRegex
         * из конфига. Если указан isSelfService: false, то так же проверяется валидность address на наличие полей и вызывается
         * `core-cart-check` событие. Каждый подписанный елемент влияет на результат проверки. В зависимости от настроек функция
         * отдаёт успешность проверки.
         * @param customer - данные заказчика
         * @param isSelfService - является ли самовывозов
         * @param address - адресс, обязательный, если это самовывоз
         * @param paymentMethod - платежная система
         * @return Результат проверки. Если проверка данных заказчика или адресса в случае не самомвывоза дали ошибку, то false. Иначе,
         * если в конфиге checkConfig.requireAll==true, то успех функции только в случае, если все подписки `core-cart-check` вернули положительный результат работы.
         * Если в конфгие checkConfig.notRequired==true, то независимо от результата всех подписчиков `core-cart-check` будет положительный ответ.
         * Иначе если хотя бы один подписчик `core-cart-check` ответил успешно, то вся функция считается успешной.
         * Если результат был успешен, то корзина переходит из состояния CART в CHECKOUT.
         * @fires cart:cart-before-check - вызывается перед началом функции. Результат подписок игнорируется.
         * @fires cart:core-cart-check-self-service - вызывается если isSelfService==true перед начало логики изменения корзины. Результат подписок игнорируется.
         * @fires cart:core-cart-check-delivery - вызывается после проверки customer если isSelfService==false. Результат подписок игнорируется.
         * @fires cart:core-cart-check - проверка заказа на возможность исполнения. Результат исполнения каждого подписчика влияет на результат.
         * @fires cart:core-cart-after-check - событие сразу после выполнения основной проверки. Результат подписок игнорируется.
         */
        check: async function (customer, isSelfService, address, paymentMethodId) {
            const self = await Cart.returnFullCart(this);
            //const self: Cart = this;
            if (self.paid) {
                sails.log.error("CART > Check > error", self.id, "cart is paid");
                return false;
            }
            /**
             *  // IDEA Возможно надо добавить параметр Время Жизни  для чека (Сделать глобально понятие ревизии системы int если оно меньше версии чека, то надо проходить чек заново)
             */
            getEmitter_1.default().emit('core-cart-before-check', self, customer, isSelfService, address);
            sails.log.verbose('Cart > check > before check >', customer, isSelfService, address, paymentMethodId);
            if (customer) {
                await checkCustomerInfo(customer);
                self.customer = customer;
            }
            else {
                if (self.customer === undefined) {
                    throw {
                        code: 2,
                        error: 'customer is required'
                    };
                }
            }
            if (address) {
                checkAddress(address);
                self.address = address;
            }
            else {
                if (self.address === undefined) {
                    throw {
                        code: 2,
                        error: 'address is required'
                    };
                }
            }
            await checkDate(self);
            if (paymentMethodId) {
                await checkPaymentMethod(paymentMethodId);
                self.paymentMethod = paymentMethodId;
                self.paymentMethodTitle = (await PaymentMethod.findOne(paymentMethodId)).title;
                self.isPaymentPromise = await PaymentMethod.isPaymentPromise(paymentMethodId);
            }
            isSelfService = isSelfService === undefined ? false : isSelfService;
            if (isSelfService) {
                // TODO непонятно почему тут не вызывается ожтдающий эммитер
                getEmitter_1.default().emit('core-cart-check-self-service', self, customer, isSelfService, address);
                sails.log.verbose('Cart > check > is self delivery');
                await self.setSelfService(true);
                await self.next('CHECKOUT');
                return true;
            }
            getEmitter_1.default().emit('core-cart-check-delivery', self, customer, isSelfService, address);
            const results = await getEmitter_1.default().emit('core-cart-check', self, customer, isSelfService, address, paymentMethodId);
            await self.save();
            sails.log.info('Cart > check > after wait general emitter', self, results);
            const resultsCount = results.length;
            const successCount = results.filter(r => r.state === "success").length;
            getEmitter_1.default().emit('core-cart-after-check', self, customer, isSelfService, address);
            if (resultsCount === 0)
                return true;
            const checkConfig = await SystemInfo.use('check');
            if (checkConfig) {
                if (checkConfig.requireAll) {
                    if (resultsCount === successCount) {
                        if (self.getState() !== 'CHECKOUT') {
                            await self.next('CHECKOUT');
                        }
                    }
                    return resultsCount === successCount;
                }
                if (checkConfig.notRequired) {
                    if (self.getState() !== 'CHECKOUT') {
                        await self.next('CHECKOUT');
                    }
                    return true;
                }
            }
            if (successCount > 0) {
                if (self.getState() === 'CART') {
                    await self.next('CHECKOUT');
                }
            }
            return successCount > 0;
        },
        /**
         * Вызывет core-cart-order. Каждый подписанный елемент влияет на результат заказа. В зависимости от настроек функция
         * отдаёт успешность заказа.
         * @return код результата:
         *  - 0 - успешно проведённый заказ от всех слушателей.
         *  - 1 - ни один слушатель не смог успешно сделать заказ.
         *  - 2 - по крайней мере один слушатель успешно выполнил заказ.
         *  - 3 - ошибка состояний
         * @fires cart:core-cart-before-order - вызывается перед началом функции. Результат подписок игнорируется.
         * @fires cart:core-cart-order-self-service - вызывается, если совершается заказ с самовывозом.
         * @fires cart:core-cart-order-delivery - вызывается, если заказ без самовывоза
         * @fires cart:core-cart-order - событие заказа. Каждый слушатель этого события влияет на результат события.
         * @fires cart:core-cart-after-order - вызывается сразу после попытки оформить заказ.
         */
        order: async function () {
            const self = this;
            // await self.save();
            // PTODO: проверка эта нужна
            // if(( self.isPaymentPromise && self.paid) || ( !self.isPaymentPromise && !self.paid) )
            //   return 3
            getEmitter_1.default().emit('core-cart-before-order', self);
            sails.log.verbose('Cart > order > before order >', self.customer, self.selfService, self.address);
            if (this.selfService) {
                getEmitter_1.default().emit('core-cart-order-self-service', self);
            }
            else {
                getEmitter_1.default().emit('core-cart-order-delivery', self);
            }
            await Cart.countCart(self);
            const results = await getEmitter_1.default().emit('core-cart-order', self);
            sails.log.verbose('Cart > order > after wait general emitter results: ', results);
            const resultsCount = results.length;
            const successCount = results.filter(r => r.state === "success").length;
            self.orderDate = moment().format("YYYY-MM-DD HH:mm:ss"); // TODO timezone
            sails.log.info('Cart > order > before save cart', self);
            const orderConfig = await SystemInfo.use('order');
            if (orderConfig) {
                if (orderConfig.requireAll) {
                    if (resultsCount === successCount) {
                        order();
                        return 0;
                    }
                    else if (successCount === 0) {
                        return 1;
                    }
                    else {
                        return 2;
                    }
                }
                if (orderConfig.notRequired) {
                    order();
                    return 0;
                }
            }
            if (true || false) { // философия доставочной пушки
                order();
                return 0;
            }
            else {
                return 1;
            }
            async function order() {
                await self.next('ORDER');
                /** Если сохранние модели вызвать до next то будет бесконечный цикл */
                await self.save();
                getEmitter_1.default().emit('core-cart-after-order', self);
            }
        },
        /**
         * Вызывет core-cart-payment.
         * @return код результата:
         *  - 0 - успешно проведённый заказ от всех слушателей.
         *  - 1 - ни один слушатель не смог успешно сделать заказ.
         *  - 2 - по крайней мере один слушатель успешно выполнил заказ.
         *  - 3 - ошибка состояний
         * @fires cart:core-cart-before-payment - вызывается перед началом функции. Результат подписок игнорируется.
         * @fires cart:core-cart-payment-self-service - вызывается, если совершается заказ с самовывозом.
         * @fires cart:core-cart-payment-delivery - вызывается, если заказ без самовывоза
         * @fires cart:core-cart-payment - событие заказа. Каждый слушатель этого события влияет на результат события.
         * @fires cart:core-cart-after-payment - вызывается сразу после попытки оформить заказ.
         */
        payment: async function () {
            const self = this;
            var paymentResponse;
            let comment = "";
            var backLinkSuccess = (await SystemInfo.use('FrontendOrderPage')) + self.id;
            var backLinkFail = await SystemInfo.use('FrontendCheckoutPage');
            let paymentMethodId = await self.paymentMethodId();
            sails.log.verbose('Cart > payment > before payment register', self);
            var params = {
                backLinkSuccess: backLinkSuccess,
                backLinkFail: backLinkFail,
                comment: comment
            };
            await Cart.countCart(self);
            await getEmitter_1.default().emit('core-cart-payment', self, params);
            sails.log.info("Cart > payment > self before register:", self);
            try {
                paymentResponse = await PaymentDocument.register(self.id, 'cart', self.cartTotal, paymentMethodId, params.backLinkSuccess, params.backLinkFail, params.comment, self);
            }
            catch (e) {
                getEmitter_1.default().emit('error', 'cart>payment', e);
                sails.log.error('Cart > payment: ', e);
            }
            await self.next('PAYMENT');
            return paymentResponse;
        },
        paymentMethodId: async function (cart) {
            if (!cart)
                cart = this;
            //@ts-ignore
            let populatedCart = await Cart.findOne({ id: cart.id }).populate('paymentMethod');
            //@ts-ignore
            return populatedCart.paymentMethod.id;
        }
    },
    afterUpdate: async function (values, next) {
        sails.log.verbose('Cart > afterUpdate > ', values);
        if (values.paid && values.state === 'PAYMENT') {
            let cart = await Cart.findOne(values.id);
            await cart.order();
        }
        next();
    },
    /**
     * Возвращает корзину со всем популяризациями, то есть каждый CartDish в заданой cart имеет dish и modifiers, каждый dish
     * содержит в себе свои картинки, каждый модификатор внутри cart.dishes и каждого dish содержит группу модификаторов и
     * самоблюдо модификатора и тд.
     * @param cart
     */
    returnFullCart: async function (cart) {
        getEmitter_1.default().emit('core-cart-before-return-full-cart', cart);
        sails.log.verbose('Cart > returnFullCart > input cart', cart);
        let cart2 = await Cart.findOne({ id: cart.id }).populate('dishes');
        const cartDishes = await CartDish.find({ cart: cart.id }).populate('dish').sort('createdAt');
        for (let cartDish of cartDishes) {
            if (!cartDish.dish) {
                sails.log.error('cartDish', cartDish.id, 'has not dish');
                continue;
            }
            if (!cart2.dishes.filter(d => d.id === cartDish.id).length) {
                sails.log.error('cartDish', cartDish.id, 'not exists in cart', cart.id);
                continue;
            }
            const dish = await Dish.findOne({
                id: cartDish.dish.id,
                isDeleted: false
            }).populate('images').populate('parentGroup');
            const reason = checkExpression_1.default(dish);
            if (dish && dish.parentGroup)
                var reasonG = checkExpression_1.default(dish.parentGroup);
            const reasonBool = reason === 'promo' || reason === 'visible' || !reason || reasonG === 'promo' ||
                reasonG === 'visible' || !reasonG;
            if (dish && dish.parentGroup && reasonBool && (dish.balance === -1 ? true : dish.balance >= cartDish.amount)) {
                await Dish.getDishModifiers(dish);
                cartDish.dish = dish;
                // sails.log.info('CARTDISH DISH MODIFIERS', dish.modifiers);
            }
            else {
                sails.log.info('destroy', dish.id);
                getEmitter_1.default().emit('core-cart-return-full-cart-destroy-cartdish', dish, cart);
                await CartDish.destroy(dish);
                cart2.dishes.remove(cartDish.id);
                delete cart2.dishes[cart.dishes.indexOf(cartDish)];
                delete cartDishes[cartDishes.indexOf(cartDish)];
                await cart2.save();
            }
        }
        cart2.dishes = cartDishes;
        // sails.log.info(cart);
        await this.countCart(cart2);
        for (let cartDish of cartDishes) {
            if (cartDish.modifiers) {
                for (let modifier of cartDish.modifiers) {
                    modifier.dish = await Dish.findOne(modifier.id);
                }
            }
        }
        cart2.orderDateLimit = await getOrderDateLimit();
        cart2.cartId = cart2.id;
        await getEmitter_1.default().emit('core-cart-after-return-full-cart', cart2);
        return cart2;
    },
    /**
     * Считает количество, вес и прочие данные о корзине в зависимости от полоенных блюд
     * @param cart
     */
    countCart: async function (cart) {
        getEmitter_1.default().emit('core-cart-before-count', cart);
        const cartDishes = await CartDish.find({ cart: cart.id }).populate('dish');
        const cartDishesClone = {};
        cart.dishes.map(cd => cartDishesClone[cd.id] = _.cloneDeep(cd));
        let orderTotal = 0;
        let cartTotal = 0;
        let dishesCount = 0;
        let uniqueDishes = 0;
        let totalWeight = 0;
        // sails.log.info(dishes);
        await Promise.map(cartDishes, async (cartDish) => {
            try {
                if (cartDish.dish) {
                    const dish = await Dish.findOne(cartDish.dish.id);
                    if (!dish) {
                        sails.log.error('Dish with id ' + cartDish.dish.id + ' not found!');
                        getEmitter_1.default().emit('core-cart-count-reject-no-dish', cartDish, cart);
                        return sails.log.error('Cart > count > error1', 'Dish with id ' + cartDish.dish.id + ' not found!');
                    }
                    cartDish.uniqueItems = 1;
                    cartDish.itemTotal = 0;
                    cartDish.weight = cartDish.dish.weight;
                    cartDish.totalWeight = 0;
                    if (cartDish.modifiers) {
                        for (let modifier of cartDish.modifiers) {
                            const modifierObj = await Dish.findOne(modifier.id);
                            if (!modifierObj) {
                                sails.log.error('Dish with id ' + modifier.id + ' not found!');
                                getEmitter_1.default().emit('core-cart-count-reject-no-modifier-dish', modifier, cart);
                                return sails.log.error('Cart > count > error2', 'Dish with id ' + modifier.id + ' not found!');
                            }
                            cartDish.uniqueItems++;
                            cartDish.itemTotal += modifier.amount * modifierObj.price;
                            cartDish.weight += modifierObj.weight;
                        }
                    }
                    cartDish.totalWeight = cartDish.weight * cartDish.amount;
                    cartDish.itemTotal += cartDish.dish.price;
                    cartDish.itemTotal *= cartDish.amount;
                    await cartDish.save();
                }
                if (cartDish.itemTotal)
                    orderTotal += cartDish.itemTotal;
                dishesCount += cartDish.amount;
                uniqueDishes++;
                totalWeight += cartDish.totalWeight;
            }
            catch (e) {
                sails.log.error('Cart > count > error3', e);
            }
        });
        let deliveryCost;
        if (cart.deliveryCost) {
            deliveryCost = cart.deliveryCost;
        }
        else {
            deliveryCost = 0;
        }
        cart.dishesCount = dishesCount;
        cart.uniqueDishes = uniqueDishes;
        cart.totalWeight = totalWeight;
        cart.total = orderTotal;
        cart.orderTotal = orderTotal;
        cart.cartTotal = orderTotal + deliveryCost;
        for (let cd in cart.dishes) {
            if (cart.dishes.hasOwnProperty(cd)) {
                const cartDish = cartDishes.find(cd1 => cd1.id === cart.dishes[cd].id);
                if (!cartDish)
                    continue;
                cartDish.dish = cartDishesClone[cartDish.id].dish;
                cart.dishes[cd] = cartDish; // <-- PROBLEM CODE
            }
        }
        if (cart.delivery) {
            cart.total += cart.delivery;
        }
        // // TODO возможно тут этого делать не надо. а нужно перенсти в функции вызывающие эту функцию
        // await Cart.update({id:cart.id}, {
        //     cartTotal:cartTotal,
        //     dishesCount: dishesCount,
        //     uniqueDishes: uniqueDishes,
        //     totalWeight: totalWeight,
        //     total: cartTotal
        //   });
        getEmitter_1.default().emit('core-cart-after-count', cart);
    }
};
async function checkCustomerInfo(customer) {
    if (!customer.name) {
        throw {
            code: 1,
            error: 'customer.name is required'
        };
    }
    if (!customer.phone) {
        throw {
            code: 2,
            error: 'customer.phone is required'
        };
    }
    const nameRegex = await SystemInfo.use('nameRegex');
    const phoneRegex = await SystemInfo.use('phoneRegex');
    if (nameRegex) {
        if (!nameRegex.match(customer.name)) {
            throw {
                code: 3,
                error: 'customer.name is invalid'
            };
        }
    }
    if (phoneRegex) {
        if (!phoneRegex.match(customer.phone)) {
            throw {
                code: 4,
                error: 'customer.phone is invalid'
            };
        }
    }
}
function checkAddress(address) {
    if (!address.streetId || !address.street) {
        throw {
            code: 5,
            error: 'address.streetId & address.street  is required'
        };
    }
    if (!address.home) {
        throw {
            code: 6,
            error: 'address.home is required'
        };
    }
    if (!address.city) {
        throw {
            code: 7,
            error: 'address.city is required'
        };
    }
}
async function checkPaymentMethod(paymentMethodId) {
    if (!await PaymentMethod.checkAvailable(paymentMethodId)) {
        throw {
            code: 8,
            error: 'paymentMethod not available'
        };
    }
}
async function checkDate(cart) {
    if (cart.date) {
        const date = moment(cart.date, "YYYY-MM-DD HH:mm:ss");
        if (!date.isValid()) {
            throw {
                code: 9,
                error: 'date is not valid'
            };
        }
        const possibleDatetime = await getOrderDateLimit();
        const momentDateLimit = moment(possibleDatetime);
        if (!date.isBefore(momentDateLimit)) {
            throw {
                code: 10,
                error: 'delivery far, far away! allowed not after' + possibleDatetime
            };
        }
    }
}
/**
 * Возвратит максимальное дату и время доставки
 * (по умолчанию 14 дней)
 */
async function getOrderDateLimit() {
    let periodPossibleForOrder = await SystemInfo.use('PeriodPossibleForOrder');
    if (periodPossibleForOrder === 0 || periodPossibleForOrder === undefined || periodPossibleForOrder === null) {
        periodPossibleForOrder = "20160";
    }
    return moment().add(periodPossibleForOrder, 'minutes').format("YYYY-MM-DD HH:mm:ss");
}
