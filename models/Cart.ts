/**
 * @api {API} Cart Cart
 * @apiGroup Models
 * @apiDescription Модель корзины. Имеет в себе список блюд, данные про них, методы для добавления/удаления блюд
 *
 * @apiParam {Integer} id Уникальный идентификатор
 * @apiParam {String} cartId ID корзины, по которой к ней обращается внешнее апи
 * @apiParam {[CartDish](#api-Models-ApiCartdish)[]} dishes Массив блюд в текущей корзине. Смотри [CartDish](#api-Models-ApiCartdish)
 * @apiParam {Integer} countDishes Общее количество блюд в корзине (с модификаторами)
 * @apiParam {Integer} uniqueDishes Количество уникальных блюд в корзине
 * @apiParam {Integer} cartTotal Стоимость корзины без доставки
 * @apiParam {Integer} total Стоимость корзины с доставкой
 * @apiParam {Float} delivery Стоимость доставки
 * @apiParam {Boolean} problem Есть ли проблема с отправкой на IIKO
 * @apiParam {JSON} customer Данные о заказчике
 * @apiParam {JSON} address Данные о адресе доставки
 * @apiParam {String} comment Комментарий к заказу
 * @apiParam {Integer} personsCount Количество персон
 * @apiParam {Boolean} sendToIiko Был ли отправлен заказ IIKO
 * @apiParam {String} rmsId ID заказа, который пришёл от IIKO
 * @apiParam {String} deliveryStatus Статус состояния доставки (0 успешно расчитана)
 * @apiParam {Boolean} selfDelivery Признак самовывоза
 * @apiParam {String} deliveryDescription Строка дополнительной информации о доставке
 * @apiParam {String} message Сообщение, что отправляется с корзиной
 */

/**
 * arguments - arguments of function that call emitter
 *
 * addDish:
 * 1. ['core-cart-before-add-dish', ...arguments]
 * 2. ['core-cart-add-dish-before-create-cartdish', ...arguments]
 * 3. ['core-cart-after-add-dish', cartDish, ...arguments]
 * errors:
 * - ['core-cart-add-dish-reject-amount', ...arguments]
 *
 * removeDish:
 * 1. ['core-cart-before-remove-dish', ...arguments]
 * 2. ['core-cart-after-remove-dish', ...arguments]
 * errors:
 * - ['core-cart-remove-dish-reject-no-cartdish', ...arguments]
 *
 * setCount:
 * 1. ['core-cart-before-set-count', ...arguments]
 * 2. ['core-cart-after-set-count', ...arguments]
 * errors:
 * - ['core-cart-set-count-reject-amount', ...arguments]
 * - ['core-cart-set-count-reject-no-cartdish', ...arguments]
 *
 * setModifierCount:
 * 1. ['core-cart-before-set-modifier-count', ...arguments]
 * 2. ['core-cart-after-set-modifier-count', ...arguments]
 * errors:
 * - ['core-cart-set-modifier-count-reject-amount', ...arguments]
 * - ['core-cart-set-modifier-count-reject-no-cartdish', ...arguments]
 * - ['core-cart-set-modifier-count-reject-no-modifier-dish', ...arguments]
 * - ['core-cart-set-modifier-count-reject-no-modifier-in-dish', ...arguments]
 *
 * setComment:
 * 1. ['core-cart-before-set-comment', ...arguments]
 * 2. ['core-cart-after-set-comment', ...arguments]
 * errors:
 * - ['core-cart-set-comment-reject-no-cartdish', ...arguments]
 *
 * beforeCreate:
 * 1. 'core-cart-before-create', values
 *
 * returnFullCart:
 * 1. 'core-cart-before-return-full-cart', cart
 * 2. 'core-cart-return-full-cart-destroy-cartdish', dish, cart
 * 3. 'core-cart-after-return-full-cart', cart
 *
 * count:
 * 1. 'core-cart-before-count', cart
 * 2. 'core-cart-after-count', cart
 * errors:
 * - 'core-cart-count-reject-no-dish', cartDish, cart
 * - 'core-cart-count-reject-no-modifier-dish', modifier, cart
 *
 * check:
 * 1. 'core-cart-before-check', self, customer, isSelfService, address
 * 2. 'core-cart-check', self, customer, isSelfService, address
 * 3. 'core-cart-after-check', self, customer, isSelfService, address
 */

import Modifier from "@webresto/core/modelsHelp/Modifier";
import Address from "@webresto/core/modelsHelp/Address";
import Customer from "@webresto/core/modelsHelp/Customer";
import CartDish from "@webresto/core/models/CartDish";
import checkExpression from "../../../@webresto/core/lib/checkExpression";
import StateFlow from "@webresto/core/modelsHelp/StateFlow";
import actions from "../../../@webresto/core/lib/actions";
import getEmitter from "../../../@webresto/core/lib/getEmitter";
import ORMModel from "@webresto/core/modelsHelp/ORMModel";
import ORM from "@webresto/core/modelsHelp/ORM";
import Dish from "@webresto/core/models/Dish";
import * as _ from "lodash";

module.exports = {
  attributes: {
    id: {
      type: 'string',
      primaryKey: true
    },
    cartId: 'string', //DELETE IN FUTURE
    dishes: {
      collection: 'CartDish',
      via: 'cart'
    },
    dishesCount: 'integer',
    uniqueDishes: 'integer',
    cartTotal: 'float',
    modifiers: 'json',
    delivery: 'float',
    customer: 'json',
    address: 'json',
    comment: 'string',
    personsCount: 'integer',
    problem: {
      type: 'boolean',
      defaultsTo: false
    },
    sendToIiko: {
      type: 'boolean',
      defaultsTo: false
    },
    rmsId: 'string',
    deliveryStatus: 'string',
    selfDelivery: {
      type: 'boolean',
      defaultsTo: false
    },
    deliveryDescription: {
      type: 'string',
      defaultsTo: ""
    },
    message: 'string',
    deliveryItem: 'string',
    totalWeight: 'float',
    total: 'float',

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
    addDish: async function (dish: Dish | string, amount: number, modifiers: Modifier[], comment: string, from: string): Promise<void> {
      const emitter = getEmitter();
      await emitter.emit.apply(emitter, ['core-cart-before-add-dish', ...arguments]);

      let dishObj: Dish;
      if (typeof dish === "string") {
        dishObj = await Dish.findOne(dish);

        if (!dishObj) {
          throw {body: `Dish with id ${dish} not found`, code: 2}
        }
      } else {
        dishObj = dish;
      }

      if (dishObj.balance !== -1)
        if (amount > dishObj.balance) {
          await emitter.emit.apply(emitter, ['core-cart-add-dish-reject-amount', ...arguments]);
          throw {body: `There is no so mush dishes with id ${dishObj.id}`, code: 1};
        }

      const cart = await Cart.findOne({id: this.id}).populate('dishes');

      if (modifiers && modifiers.length) {
        modifiers.forEach((m: Modifier) => {
          if (!m.amount)
            m.amount = 1;
        });
      }

      await emitter.emit.apply(emitter, ['core-cart-add-dish-before-create-cartdish', ...arguments]);

      const cartDish = await CartDish.create({
        dish: dishObj.id,
        cart: this.id,
        amount: amount,
        modifiers: modifiers || [],
        comment: comment,
        addedBy: from
      });

      await cart.next('CART');

      await emitter.emit.apply(emitter, ['core-cart-after-add-dish', cartDish, ...arguments]);
    },

    /**
     * Уменьшает количество заданного блюда на amount. Переводит корзину в состояние CART.
     * @param dish - Блюдо для изменения количества блюд
     * @param amount - насколько меньше сделать количество
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
    removeDish: async function (dish: CartDish, amount: number): Promise<void> {
      const emitter = getEmitter();
      await emitter.emit.apply(emitter, ['core-cart-before-remove-dish', ...arguments]);

      const cart = await Cart.findOne({id: this.id}).populate('dishes');

      const cartDish = await CartDish.findOne({cart: cart.id, id: dish.id}).populate('dish');
      if (!cartDish) {
        await emitter.emit.apply(emitter, ['core-cart-remove-dish-reject-no-cartdish', ...arguments]);
        throw {body: `CartDish with id ${dish.id} in cart with id ${this.id} not found`, code: 1};
      }

      const get = cartDish;
      get.amount -= amount;
      if (get.amount > 0) {
        await CartDish.update({id: get.id}, {amount: get.amount});
      } else {
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
    setCount: async function (dish: CartDish, amount: number): Promise<void> {
      const emitter = getEmitter();
      await emitter.emit.apply(emitter, ['core-cart-before-set-count', ...arguments]);

      if (dish.dish.balance !== -1)
        if (amount > dish.dish.balance) {
          await emitter.emit.apply(emitter, ['core-cart-set-count-reject-amount', ...arguments]);
          throw {body: `There is no so mush dishes with id ${dish.dish.id}`, code: 1};
        }

      const cart = await Cart.findOne(this.id).populate('dishes');
      const cartDishes = await CartDish.find({cart: cart.id}).populate('dish');
      const get = cartDishes.find(item => item.id === dish.id);

      if (get) {
        get.amount = amount;
        if (get.amount > 0) {
          await CartDish.update({id: get.id}, {amount: get.amount});
        } else {
          get.destroy();
          sails.log.info('destroy', get.id);
        }

        await cart.next('CART');

        await emitter.emit.apply(emitter, ['core-cart-after-set-count', ...arguments]);
      } else {
        await emitter.emit.apply(emitter, ['core-cart-set-count-reject-no-cartdish', ...arguments]);
        throw {body: `CartDish dish id ${dish.id} not found`, code: 2};
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
    setModifierCount: async function (dish: CartDish, modifier: Dish, amount: number): Promise<void> {
      const emitter = getEmitter();
      await emitter.emit.apply(emitter, ['core-cart-before-set-modifier-count', ...arguments]);

      if (modifier.balance !== -1)
        if (amount > modifier.balance) {
          await emitter.emit.apply(emitter, ['core-cart-set-modifier-count-reject-amount', ...arguments]);
          throw {body: `There is no so mush dishes with id ${modifier.id}`, code: 1};
        }

      const cartDishes = await CartDish.find({cart: this.id}).populate('dish').populate('modifiers');
      const get = cartDishes.filter(item => item.dish.id === dish.id)[0];

      if (!get) {
        await emitter.emit.apply(emitter, ['core-cart-set-modifier-count-reject-no-cartdish', ...arguments]);
        throw {body: `CartDish dish id ${dish.id} not found`, code: 2};
      }

      const dish1 = await Dish.findOne({id: dish.id});

      // check that dish has this modifier
      const getModif = dish1.modifiers.find(item => item.id === modifier.id);

      if (!getModif) {
        await emitter.emit.apply(emitter, ['core-cart-set-modifier-count-reject-no-modifier-dish', ...arguments]);
        throw {body: `Dish dish id ${getModif.id} not found`, code: 3};
      }

      let getMofifFromDish = get.modifiers.filter(item => modifier.id === item.dish.id)[0];

      if (!getMofifFromDish) {
        await emitter.emit.apply(emitter, ['core-cart-set-modifier-count-reject-no-modifier-in-dish', ...arguments]);
        throw {body: `Modifier ${modifier.id} in dish id ${dish.id} not found`, code: 4};
      }

      getMofifFromDish.amount = amount;

      await CartDish.update({id: getMofifFromDish.id}, {amount: getMofifFromDish.amount});

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
    setComment: async function (dish: CartDish, comment: string): Promise<void> {
      const emitter = getEmitter();
      await emitter.emit.apply(emitter, ['core-cart-before-set-comment', ...arguments]);

      const cart = await Cart.findOne(this.id).populate('dishes');

      const cartDish = await CartDish.findOne({cart: cart.id, id: dish.id}).populate('dish');

      if (cartDish) {
        await CartDish.update(cartDish.id, {comment: comment});

        await cart.next('CART');
        await this.countCart(cart);

        await emitter.emit.apply(emitter, ['core-cart-after-set-comment', ...arguments]);
      } else {
        await emitter.emit.apply(emitter, ['core-cart-set-comment-reject-no-cartdish', ...arguments]);
        throw {body: `CartDish with id ${dish.id} not found`, code: 1};
      }
    },

    /**
     * Set cart selfDelivery field. Use this method to change selfDelivery.
     * @param selfService
     */
    setSelfDelivery: async function (selfService: boolean): Promise<void> {
      const self: Cart = this;

      sails.log.verbose('Cart > setSelfDelivery >', selfService);

      await actions.reset(this.id);

      self.selfDelivery = selfService;
      await self.save();

      if (self.getState() === 'CART')
        await self.next();
    },

    /**
     * Проверяет ваидность customer. Проверка проходит на наличие полей и их валидность соответсвенно nameRegex и phoneRegex
     * из конфига. Если указан isSelfService: false, то так же проверяется валидность address на наличие полей и вызывается
     * `core-cart-check` событие. Каждый подписанный елемент влияет на результат проверки. В зависимости от настроек функция
     * отдаёт успешность проверки.
     * @param customer - данные заказчика
     * @param isSelfService - является ли самовывозов
     * @param address - адресс, обязательный, если это самовывоз
     * @return Результат проверки. Если проверка данных заказчика или адресса в случае самомвывоза дали ошибку, то false. Иначе,
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
    check: async function (customer: Customer, isSelfService: boolean, address?: Address): Promise<boolean> {
      const self: Cart = this;
      getEmitter().emit('core-cart-before-check', self, customer, isSelfService, address);
      sails.log.verbose('Cart > check > before check >', customer, isSelfService, address);

      await checkCustomerInfo(customer);

      self.customer = customer;
      await self.save();

      if (isSelfService) {
        getEmitter().emit('core-cart-check-self-service', self, customer, isSelfService, address);
        sails.log.verbose('Cart > check > is self delivery');
        await self.setSelfDelivery(true);
        return true;
      }

      getEmitter().emit('core-cart-check-delivery', self, customer, isSelfService, address);

      checkAddress(address);

      self.address = address;
      await self.save();

      const results = await getEmitter().emit('core-cart-check', self, customer, isSelfService, address);
      sails.log.verbose('Cart > check > after wait general emitter', results);
      const resultsCount = results.length;
      const successCount = results.filter(r => r.state === "success").length;

      getEmitter().emit('core-cart-after-check', self, customer, isSelfService, address);

      if (resultsCount === 0)
        return true;

      const checkConfig = await SystemInfo.use('check');
      if (checkConfig) {
        if (checkConfig.requireAll) {
          if (resultsCount === successCount) {
            if (self.getState() !== 'CHECKOUT') {
              await self.next();
            }
          }
          return resultsCount === successCount;
        }
        if (checkConfig.notRequired) {
          if (self.getState() === 'CHECKOUT') {
            await self.next();
          }
          return true;
        }
      }
      if (successCount > 0) {
        if (self.getState() === 'CHECKOUT') {
          await self.next();
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
     * @fires cart:core-cart-before-order - вызывается перед началом функции. Результат подписок игнорируется.
     * @fires cart:core-cart-order-self-service - вызывается, если совершается заказ с самовывозом.
     * @fires cart:core-cart-order-delivery - вызывается, если заказ без самовывоза
     * @fires cart:core-cart-order - событие заказа. Каждый слушатель этого события влияет на результат события.
     * @fires cart:core-cart-after-order - вызывается сразу после попытки оформить заказ.
     */
    order: async function (): Promise<number> {
      const self: Cart = this;
      getEmitter().emit('core-cart-before-order', self);
      sails.log.verbose('Cart > order > before order >', self.customer, self.selfDelivery, self.address);

      if (this.selfDelivery) {
        getEmitter().emit('core-cart-order-self-service', self);
      } else {
        getEmitter().emit('core-cart-order-delivery', self);
      }

      const results = await getEmitter().emit('core-cart-order', self);
      sails.log.verbose('Cart > order > after wait general emitter', results);
      const resultsCount = results.length;
      const successCount = results.filter(r => r.state === "success").length;

      getEmitter().emit('core-cart-after-order', self);

      const orderConfig = await SystemInfo.use('order');
      if (orderConfig) {
        if (orderConfig.requireAll) {
          if (resultsCount === successCount) {
            await self.next();
            return 0;
          } else if (successCount === 0) {
            return 1;
          } else {
            return 2;
          }
        }
        if (orderConfig.notRequired) {
          await self.next();
          return 0;
        }
      }
      if (successCount > 0) {
        await self.next();
        return 0;
      } else {
        return 1;
      }
    }
  },

  beforeCreate: function (values, next) {
    getEmitter().emit('core-cart-before-create', values).then(() => {
      this.countCart(values).then(next, next);
    });
  },

  /**
   * Возвращает корзину со всем популярищациями, то есть каждый CartDish в заданой cart имеет dish и modifiers, каждый dish
   * содержит в себе свои картинки, каждый модификатор внутри cart.dishes и каждого dish содержит группу модификаторов и
   * самоблюдо модификатора и тд.
   * @param cart
   */
  returnFullCart: async function (cart: Cart): Promise<Cart> {
    getEmitter().emit('core-cart-before-return-full-cart', cart);

    const cart2 = await Cart.findOne({id: cart.id}).populate('dishes');

    const cartDishes = await CartDish.find({cart: cart.id}).populate('dish').sort('createdAt');
    for (let cartDish of cartDishes) {
      // sails.log.info('rfc', cartDish.id);
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

      const reason = checkExpression(dish);
      const reasonG = checkExpression(dish.parentGroup);
      const reasonBool = reason === 'promo' || reason === 'visible' || !reason || reasonG === 'promo' ||
        reasonG === 'visible' || !reasonG;
      if (dish && dish.parentGroup && reasonBool && (dish.balance === -1 ? true : dish.balance >= cartDish.amount)) {
        await Dish.getDishModifiers(dish);
        cartDish.dish = dish;
        // sails.log.info('CARTDISH DISH MODIFIERS', dish.modifiers);
      } else {
        sails.log.info('destroy', dish.id);
        getEmitter().emit('core-cart-return-full-cart-destroy-cartdish', dish, cart);
        await CartDish.destroy(dish);
        cart2.dishes.remove(cartDish.id);
        delete cart2.dishes[cart.dishes.indexOf(cartDish)];
        delete cartDishes[cartDishes.indexOf(cartDish)];
        await cart2.save();
      }
    }

    cart2.dishes = cartDishes as Association<CartDish>;

    // sails.log.info(cart);
    await this.countCart(cart2);

    for (let cartDish of cartDishes) {
      if (cartDish.modifiers) {
        for (let modifier of cartDish.modifiers) {
          modifier.dish = await Dish.findOne(modifier.id);
        }
      }
    }

    getEmitter().emit('core-cart-after-return-full-cart', cart2);

    cart2.cartId = cart2.id;
    return cart2;
  },

  /**
   * Считает количество, вес и прочие данные о корзине в зависимости от полоенных блюд
   * @param cart
   */
  countCart: async function (cart: Cart) {
    getEmitter().emit('core-cart-before-count', cart);

    const cartDishes = await CartDish.find({cart: cart.id}).populate('dish');
    const cartDishesClone = {};
    cart.dishes.map(cd => cartDishesClone[cd.id] = _.cloneDeep(cd));

    let cartTotal = 0;
    let dishesCount = 0;
    let uniqueDishes = 0;
    let totalWeight = 0;

    // sails.log.info(dishes);

    await Promise.map(cartDishes, async (cartDish: CartDish) => {
      try {
        if (cartDish.dish) {
          const dish = await Dish.findOne(cartDish.dish.id);

          if (!dish) {
            sails.log.error('Dish with id ' + cartDish.dish.id + ' not found!');
            getEmitter().emit('core-cart-count-reject-no-dish', cartDish, cart);
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
                getEmitter().emit('core-cart-count-reject-no-modifier-dish', modifier, cart);
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
          cartTotal += cartDish.itemTotal;
        dishesCount += cartDish.amount;
        uniqueDishes++;
        totalWeight += cartDish.totalWeight;
      } catch (e) {
        sails.log.error('Cart > count > error3', e);
      }
    });

    cart.cartTotal = cartTotal;
    cart.dishesCount = dishesCount;
    cart.uniqueDishes = uniqueDishes;
    cart.totalWeight = totalWeight;
    cart.total = cartTotal;

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

    getEmitter().emit('core-cart-after-count', cart);
  }
};

async function checkCustomerInfo(customer) {
  if (!customer.name) {
    throw {
      code: 1,
      error: 'customer.name is required'
    }
  }
  if (!customer.phone) {
    throw {
      code: 2,
      error: 'customer.phone is required'
    }
  }
  const nameRegex = await SystemInfo.use('nameRegex');
  const phoneRegex = await SystemInfo.use('phoneRegex');
  if (nameRegex) {
    if (!nameRegex.match(customer.name)) {
      throw {
        code: 3,
        error: 'customer.name is invalid'
      }
    }
  }
  if (phoneRegex) {
    if (!phoneRegex.match(customer.phone)) {
      throw {
        code: 4,
        error: 'customer.phone is invalid'
      }
    }
  }
}

function checkAddress(address) {
  if (!address.street) {
    throw {
      code: 5,
      error: 'address.streetId is required'
    }
  }

  if (!address.home) {
    throw {
      code: 6,
      error: 'address.home is required'
    }
  }

  if (!address.city) {
    throw {
      code: 7,
      error: 'address.city is required'
    }
  }
}

/**
 * Описывает модель корзины. Содержит в себе блюда и данных о них, данные о заказчике и месте доставки.
 * Имеет состояние state, которое указывает в каком моменте жизненного цикла сейчас находится корзина.
 * Схематически цикл переходов выглядить так
 * -> CART <-> CHECKOUT  -> COMPLETE
 */
export default interface Cart extends ORM, StateFlow {
  id: string;
  cartId: string; // DELETE IN FUTURE
  dishes: Association<CartDish>;
  dishesCount: number;
  uniqueDishes: number;
  cartTotal: number;
  modifiers: Modifier[];
  delivery: number;
  customer: Customer;
  address: Address;
  comment: string;
  personsCount: number;
  problem: boolean;
  sendToIiko: boolean;
  rmsId: string;
  deliveryStatus: number;
  selfDelivery: boolean;
  deliveryDescription: string;
  message: string;
  deliveryItem: string;
  totalWeight: number;
  total: number;

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
  addDish(dish: Dish | string, amount: number, modifiers: Modifier[], comment: string, from: string): Promise<void>;

  /**
   * Уменьшает количество заданного блюда на amount. Переводит корзину в состояние CART.
   * @param dish - Блюдо для изменения количества блюд
   * @param amount - насколько меньше сделать количество
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
  removeDish(dish: CartDish, amount: number): Promise<void>;

  /**
   * Устанавливает заданное количество для заданного блюда в текущей корзине. Если количество меньше 0, то блюдо будет
   * удалено из корзины. Переводит корзину в состояние CART.
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
  setCount(dish: CartDish, amount: number): Promise<void>;

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
  setModifierCount(dish: CartDish, modifier: Dish, amount: number): Promise<void>;

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
  setComment(dish: CartDish, comment: string): Promise<void>;

  /**
   * Меняет поле корзины selfDelivery на заданное. Используйте только этот метод для изменения параметра selfDelivery.
   * @param selfService
   */
  setSelfDelivery(selfService: boolean): Promise<void>;

  /**
   * Проверяет ваидность customer. Проверка проходит на наличие полей и их валидность соответсвенно nameRegex и phoneRegex
   * из конфига. Если указан isSelfService: false, то так же проверяется валидность address на наличие полей и вызывается
   * `core-cart-check` событие. Каждый подписанный елемент влияет на результат проверки. В зависимости от настроек функция
   * отдаёт успешность проверки.
   * @param customer - данные заказчика
   * @param isSelfService - является ли самовывозов
   * @param address - адресс, обязательный, если это самовывоз
   * @return Результат проверки. Если проверка данных заказчика или адресса в случае самомвывоза дали ошибку, то false. Иначе,
   * если в конфиге checkConfig.requireAll==true, то успех функции только в случае, если все подписки `core-cart-check` вернули положительный результат работы.
   * Если в конфгие checkConfig.notRequired==true, то независимо от результата всех подписчиков `core-cart-check` будет положительный ответ.
   * Иначе если хотя бы один подписчик `core-cart-check` ответил успешно, то вся функция считается успешной.
   * Если результат был успешен, то корзина переходит из состояния CART в CHECKOUT.
   * @fires cart:core-cart-before-check - вызывается перед началом функции. Результат подписок игнорируется.
   * @fires cart:core-cart-check-self-service - вызывается если isSelfService==true перед начало логики изменения корзины. Результат подписок игнорируется.
   * @fires cart:core-cart-check-delivery - вызывается после проверки customer если isSelfService==false. Результат подписок игнорируется.
   * @fires cart:core-cart-check - проверка заказа на возможность исполнения. Результат исполнения каждого подписчика влияет на результат.
   * @fires cart:core-cart-after-check - событие сразу после выполнения основной проверки. Результат подписок игнорируется.
   */
  check(customer: Customer, isSelfService: boolean, address?: Address): Promise<boolean>;

  /**
   * Вызывет core-cart-order. Каждый подписанный елемент влияет на результат заказа. В зависимости от настроек функция
   * отдаёт успешность заказа.
   * @return код результата:
   *  - 0 - успешно проведённый заказ от всех слушателей.
   *  - 1 - ни один слушатель не смог успешно сделать заказ.
   *  - 2 - по крайней мере один слушатель успешно выполнил заказ.
   * @fires cart:core-cart-before-order - вызывается перед началом функции. Результат подписок игнорируется.
   * @fires cart:core-cart-order-self-service - вызывается, если совершается заказ с самовывозом.
   * @fires cart:core-cart-order-delivery - вызывается, если заказ без самовывоза
   * @fires cart:core-cart-order - событие заказа. Каждый слушатель этого события влияет на результат события.
   * @fires cart:core-cart-after-order - вызывается сразу после попытки оформить заказ.
   */
  order(): Promise<number>;
}

/**
 * Описывает класс Cart, содержит статические методы, используется для ORM
 */
export interface CartModel extends ORMModel<Cart> {
  /**
   * Возвращает корзину со всем популярищациями, то есть каждый CartDish в заданой cart имеет dish и modifiers, каждый dish
   * содержит в себе свои картинки, каждый модификатор внутри cart.dishes и каждого dish содержит группу модификаторов и
   * самоблюдо модификатора и тд.
   * @param cart
   */
  returnFullCart(cart: Cart): Promise<Cart>;

  /**
   * Считает количество, вес и прочие данные о корзине в зависимости от полоенных блюд
   * @param cart
   */
  countCart(cart: Cart);
}

declare global {
  const Cart: CartModel;
}
