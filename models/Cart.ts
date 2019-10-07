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
 * addDishAndReturnCart:
 * 1. ['core-cart-before-add-dish', ...arguments]
 * 2. ['core-cart-add-dish-before-create-cartdish', ...arguments]
 * 3. ['core-cart-after-add-dish', cartDish, ...arguments]
 * errors:
 * - ['core-cart-add-dish-reject-amount', ...arguments]
 * - ['core-cart-add-dish-reject', reason, ...arguments]
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
 */

import Modifier from "@webresto/core/modelsHelp/Modifier";
import Address from "@webresto/core/modelsHelp/Address";
import Customer from "@webresto/core/modelsHelp/Customer";
import Dish from "@webresto/core/models/Dish";
import CartDish from "@webresto/core/models/CartDish";
import checkExpression from "@webresto/core/lib/checkExpression";
import StateFlow from "@webresto/core/modelsHelp/StateFlow";
import Emitter from "@webresto/core/lib/emmiter";
import actions from "@webresto/core/lib/actions";

// @ts-ignore
const Promise = require('bluebird');

declare const Cart;
declare const Dish;
declare const CartDish;
declare const sails;

module.exports = {
  attributes: {
    id: {
      type: 'string',
      primaryKey: true
    },
    dishes: {
      collection: 'cartDish',
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
     * @description Add dish in cart
     * @param dish
     * @param amount
     * @param modifiers - json
     * @param comment
     * @param from
     * @returns Promise<Cart>
     */
    addDish: async function (dish: Dish | string, amount: number, modifiers: Modifier[], comment: string, from: string): Promise<Cart> {
      await Emitter.emit.apply(this, ['core-cart-before-add-dish', ...arguments]);

      let dishObj: Dish;
      if (typeof dish === "string") {
        dishObj = await Dish.findOne(dish);

        if (!dishObj) {
          throw {error: 'Dish with id ' + dish + ' not found', code: 2}
        }
      } else {
        dishObj = dish;
      }

      if (dishObj.balance !== -1)
        if (amount > dishObj.balance) {
          await Emitter.emit.apply(this, ['core-cart-add-dish-reject-amount', ...arguments]);
          throw {error: 'There is no so mush dishes ' + dishObj.id, code: 1};
        }

      const cart = <Cart>await Cart.findOne({id: this.id}).populate('dishes');

      const reason = checkExpression(dishObj);
      if (reason) {
        if (reason !== 'promo') {
          await cart.next('CART');
          await Emitter.emit.apply(this, ['core-cart-add-dish-reject', reason, ...arguments]);
          return cart;
        }
      }

      if (modifiers && modifiers.length) {
        modifiers.forEach((m: Modifier) => {
          if (!m.amount)
            m.amount = 1;
        });
      }

      await Emitter.emit.apply(this, ['core-cart-add-dish-before-create-cartdish', ...arguments]);

      const cartDish = await CartDish.create({
        dish: dishObj.id,
        cart: this.id,
        amount: amount,
        modifiers: modifiers,
        comment: comment,
        addedBy: from
      });

      await cart.next('CART');

      await Emitter.emit.apply(this, ['core-cart-after-add-dish', cartDish, ...arguments]);
    },

    /**
     * @description Remove dish from cart
     * @param dish
     * @param amount
     * @return function
     */
    removeDish: async function (dish: CartDish, amount: number): Promise<void> {
      await Emitter.emit.apply(this, ['core-cart-before-remove-dish', ...arguments]);

      const cart = <Cart>await Cart.findOne({id: this.id}).populate('dishes');

      const cartDish = <CartDish>await CartDish.findOne({cart: cart.id, id: dish.id}).populate('dish');
      if (!cartDish) {
        await Emitter.emit.apply(this, ['core-cart-remove-dish-reject-no-cartdish', ...arguments]);
        throw {error: 'CartDish with id ' + dish.id + ' not found', code: 1};
      }

      const get = cartDish;
      get.amount -= amount;
      if (get.amount > 0) {
        await CartDish.update({id: get.id}, {amount: get.amount});
      } else {
        get.destroy();
      }

      await cart.next('CART');

      await Emitter.emit.apply(this, ['core-cart-after-remove-dish', ...arguments]);
    },

    /**
     * Set dish count
     * @param dish
     * @param amount
     * @return {error, cart}
     */
    setCount: async function (dish: Dish, amount: number): Promise<void> {
      await Emitter.emit.apply(this, ['core-cart-before-set-count', ...arguments]);

      if (dish.balance !== -1)
        if (amount > dish.balance) {
          await Emitter.emit.apply(this, ['core-cart-set-count-reject-amount', ...arguments]);
          throw {error: 'There is no so mush dishes ' + dish.id};
        }

      const cart = <Cart>await Cart.findOne({id: this.id}).populate('dishes');

      const cartDishes: CartDish[] = await CartDish.find({cart: cart.id}).populate('dish');

      const get = cartDishes.filter(item => item.dish.id === dish.id)[0];

      if (get) {
        get.amount = amount;
        if (get.amount > 0) {
          await CartDish.update({id: get.id}, {amount: get.amount});
        } else {
          get.destroy();
        }

        await cart.next('CART');

        await Emitter.emit.apply(this, ['core-cart-after-set-count', ...arguments]);
      } else {
        await Emitter.emit.apply(this, ['core-cart-set-count-reject-no-cartdish', ...arguments]);
        throw {error: 'CartDish dish id ' + dish.id + ' not found', code: 2};
      }
    },

    /**
     * Set modifier count
     * @param dish
     * @param modifier
     * @param amount
     * @return {*}
     */
    setModifierCount: async function (dish: CartDish, modifier: Dish, amount: number) {
      await Emitter.emit.apply(this, ['core-cart-before-set-modifier-count', ...arguments]);
      if (modifier.balance !== -1)
        if (amount > modifier.balance) {
          await Emitter.emit.apply(this, ['core-cart-set-modifier-count-reject-amount', ...arguments]);
          throw {error: 'There is no so mush dishes ' + modifier.id, code: 1};
        }

      const cartDishes = await CartDish.find({cart: this.id}).populate(['dish', 'modifiers']);
      const get = cartDishes.filter(item => item.dish.id === dish.id)[0];

      if (!get) {
        await Emitter.emit.apply(this, ['core-cart-set-modifier-count-reject-no-cartdish', ...arguments]);
        throw {error: 'CartDish dish id ' + dish.id + ' not found', code: 2};
      }

      const dish1 = <Dish>await Dish.findOne({id: dish.id});

      // check that dish has this modifier
      const getModif = <Modifier>dish1.modifiers.filter(item => item.id === modifier.id)[0];

      if (!getModif) {
        await Emitter.emit.apply(this, ['core-cart-set-modifier-count-reject-no-modifier-dish', ...arguments]);
        throw {error: 'Dish dish id ' + modifier.id + ' not found', code: 3};
      }

      let getMofifFromDish = <Modifier>get.modifiers.filter(item => modifier.id === item.dish)[0];

      if (!getMofifFromDish) {
        await Emitter.emit.apply(this, ['core-cart-set-modifier-count-reject-no-modifier-in-dish', ...arguments]);
        throw {error: 'Modifier ' + modifier.id + ' in dish id ' + modifier.id + ' not found', code: 4};
      }

      getMofifFromDish.amount = amount;

      await CartDish.update({id: getMofifFromDish.id}, {amount: getMofifFromDish.amount});

      await Emitter.emit.apply(this, ['core-cart-after-set-modifier-count', ...arguments]);
    },

    setComment: async function (dish: CartDish, comment: string): Promise<void> {
      await Emitter.emit.apply(this, ['core-cart-before-set-comment', ...arguments]);

      const cart = <Cart>await Cart.findOne(this.id).populate('dishes');

      const cartDish = <CartDish>await CartDish.findOne({cart: cart.id, id: dish.id}).populate('dish');

      if (cartDish) {
        await CartDish.update(cartDish.id, {comment: comment});

        await cart.next('CART');
        await this.count(cart);

        await Emitter.emit.apply(this, ['core-cart-after-set-comment', ...arguments]);
      } else {
        await Emitter.emit.apply(this, ['core-cart-set-comment-reject-no-cartdish', ...arguments]);
        throw {error: 'CartDish with id ' + dish.id + ' not found', code: 1};
      }
    },

    setSelfDelivery: async function (self: boolean): Promise<void> {
      await actions.reset(this.id);

      this.selfDelivery = self;
      await this.save();

      if (this.getState() === 'CART')
        await this.next();
    }
  },

  beforeCreate: function (values, next) {
    Emitter.emit('core-cart-before-create', values).then(() => {
      this.count(values).then(next).catch(next);
    });
  },

  returnFullCart: async function (cart: Cart): Promise<Cart> {
    await Emitter.emit('core-cart-before-return-full-cart', cart);

    const cart2 = <Cart>await Cart.findOne({id: cart.id}).populate('dishes');

    const cartDishes = await CartDish.find({cart: cart.id}).populate('dish');
    for (let cartDish of cartDishes) {
      if (!cartDish.dish) {
        sails.log.error('cartDish', cartDish.id, 'has not dish');
        continue;
      }

      if (!cart2.dishes.filter(d => d.id === cartDish.id).length) {
        sails.log.error('cartDish', cartDish.id, 'not exists in cart', cart.id);
        continue;
      }

      const dish = <Dish>await Dish.findOne({
        id: cartDish.dish.id,
        isDeleted: false
      }).populate(['images', 'parentGroup']);

      const reason = checkExpression(dish);
      const reasonG = checkExpression(dish.parentGroup);
      const reasonBool = reason === 'promo' || reason === 'visible' || !reason || reasonG === 'promo' ||
        reasonG === 'visible' || !reasonG;
      if (dish && dish.parentGroup && reasonBool && (dish.balance === -1 ? true : dish.balance >= cartDish.amount)) {
        await Dish.getDishModifiers(dish);
        cartDish.dish = dish;
      } else {
        sails.log.info('destroy', dish.id);
        await Emitter.emit('core-cart-return-full-cart-destroy-cartdish', dish, cart);
        await CartDish.destroy(dish);
        // @ts-ignore
        cart2.dishes.remove(cartDish.id);
        delete cart2.dishes[cart.dishes.indexOf(cartDish)];
        delete cartDishes[cartDishes.indexOf(cartDish)];
        await cart2.save();
      }

      if (Array.isArray(cartDish.modifiers)) {
        for (let modifier of cartDish.modifiers) {
          modifier.dish = <Dish>await Dish.findOne(modifier.id);
        }
      } else {
        if (cartDish.modifiers) {
          cartDish.modifiers.dish = <Dish>await Dish.findOne(cartDish.modifiers.id);
        }
      }

      cart2.dishes = cartDishes;
    }

    // sails.log.info(cart);
    await this.count(cart2);

    await Emitter.emit('core-cart-after-return-full-cart', cart);
    return cart2;
  },

  /**
   * Calculate count of dishes and modifiers in cart
   * @param cart
   * @return void
   */
  count: async function (cart: Cart) {
    await Emitter.emit('core-cart-before-count', cart);

    const cartDishes = await <CartDish>CartDish.find({cart: cart.id}).populate('dish');

    let cartTotal = 0;
    let dishesCount = 0;
    let uniqueDishes = 0;
    let totalWeight = 0;

    // sails.log.info(dishes);

    await Promise.map(cartDishes, async (cartDish: CartDish) => {
      try {
        if (cartDish.dish) {
          const dish = <Dish>await Dish.findOne(cartDish.dish.id);

          if (!dish) {
            sails.log.error('Dish with id ' + cartDish.dish.id + ' not found!');
            await Emitter.emit('core-cart-count-reject-no-dish', cartDish, cart);
            throw 'Dish with id ' + cartDish.dish.id + ' not found!';
          }

          cartDish.uniqueItems = 1;
          cartDish.itemTotal = 0;
          cartDish.weight = cartDish.dish.weight;
          cartDish.totalWeight = 0;

          for (let modifier of dish.modifiers) {
            const modifierObj = <Dish>await Dish.findOne(modifier.id);

            if (!modifierObj) {
              sails.log.error('Dish with id ' + modifier.id + ' not found!');
              await Emitter.emit('core-cart-count-reject-no-modifier-dish', modifier, cart);
              throw 'Dish with id ' + modifier.id + ' not found!'
            }

            cartDish.uniqueItems++;
            cartDish.itemTotal += modifier.amount * modifierObj.price;
            cartDish.weight += modifierObj.weight;
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
        sails.log.error('Cart > count > error1', e);
      }
    });

    cart.cartTotal = cartTotal;
    cart.dishesCount = dishesCount;
    cart.uniqueDishes = uniqueDishes;
    cart.totalWeight = totalWeight;
    cart.total = cartTotal;

    if (cart.delivery) {
      cart.total += cart.delivery;
    }

    await Emitter.emit('core-cart-after-count', cart);
  }
};

export default interface Cart extends StateFlow {
  [x: string]: any;

  id: string;
  dishes: CartDish[];
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

  next(state?: string): Promise<void>;

  save(): Promise<void>;

  addDish(dish: Dish | string, amount: number, modifiers: Modifier[], comment: string, from: string): Promise<void>;

  removeDish(dish: CartDish, amount: number): Promise<void>;

  setCount(dish: Dish, amount: number): Promise<void>;

  setModifierCount(dish: CartDish, modifier: Dish, amount: number): Promise<void>;

  setComment(dish: CartDish, comment: string): Promise<Cart>;

  setSelfDelivery(self: boolean): Promise<void>
}
