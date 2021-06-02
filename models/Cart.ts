import * as Waterline from "waterline";
import {Modifier, GroupModifier}  from "../modelsHelp/Modifier";
import Address from "../modelsHelp/Address";
import Customer from "../modelsHelp/Customer";
import CartDish from "../models/CartDish";
import checkExpression from "../lib/checkExpression";
import PaymentDocument from "./PaymentDocument"
import actions from "../lib/actions";
import getEmitter from "../lib/getEmitter";
import ORMModel from "../modelsHelp/ORMModel";
import ORM from "../modelsHelp/ORM";
import Dish from "./Dish";
import * as _ from "lodash";
import { PaymentResponse } from "../modelsHelp/Payment"
import * as moment from "moment";
import { v4 as uuid } from 'uuid';


// TODO: предлагаю переименовать и корзины в ордер.
let cartCollection: Waterline.Collection = {
    //@ts-ignore
    autoPK: false,
    attributes: {
      id: {
        type: 'string',
        primaryKey: true,
        defaultsTo: function (){ return uuid(); }
      },
      cartId: 'string',
      shortId:{
        type: 'string',
        defaultsTo: function (){ return this.id.substr(this.id.length - 8).toUpperCase() },
      },
      dishes: {
        collection: 'CartDish',
        via: 'cart'
      },
      discount: 'json',
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
      modifiers: 'json', //maybe dont needed here
      customer: 'json',
      address: 'json',
      comment: 'string',
      personsCount: 'string',
      //@ts-ignore Я думаю там гдето типизация для даты на ватерлайн типизации
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
      message: 'string', // deprecated
      deliveryItem: 'string',
      deliveryCost: {
        type: 'float',
        defaultsTo: 0
      }, // rename to deliveryCost
      totalWeight: {
        type: 'float',
        defaultsTo: 0
      },
      total: {
        type: 'float',
        defaultsTo: 0
      }, // total = cartTotal
      orderTotal: {
        type: 'float',
        defaultsTo: 0
      }, // orderTotal = total + deliveryCost - discountTotal - bonusesTotal
      cartTotal: {
        type: 'float',
        defaultsTo: 0
      },
      discountTotal: {
        type: 'float',
        defaultsTo: 0
      },
      orderDate: 'datetime'
    }
  }



let cartInstance: Cart = {
  addDish: async function (dish: Dish | string, amount: number, modifiers: Modifier[], comment: string, from: string, replace: boolean, cartDishId: number, ) : Promise<void> {
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

    if (cart.dishes.length > 99)
      throw "99 max dishes amount"

    if (cart.state === "ORDER")
      throw "cart with cartId "+ cart.id + "in state ORDER"

    if (modifiers && modifiers.length) {
      modifiers.forEach((m: Modifier) => {
        if (!m.amount)
          m.amount = 1;
      });
    }

    await emitter.emit.apply(emitter, ['core-cart-add-dish-before-create-cartdish', ...arguments]);
    let cartDish: CartDish;

    // auto replace and increase amount if same dishes without modifiers
    if(!replace && (!modifiers || (modifiers && modifiers.length === 0)) ){
      let sameCartDishArray = await CartDish.find({cart: this.id, dish: dishObj.id});
      for(let sameCartDish of sameCartDishArray){
        if(sameCartDish && sameCartDish.modifiers && sameCartDish.modifiers.length === 0){
          cartDishId = Number(sameCartDish.id);
          amount = amount + sameCartDish.amount;
          replace = true;
          break;
        }
      }
    }
    if(replace) {
      cartDish = (await CartDish.update({id: cartDishId},{
        dish: dishObj.id,
        cart: this.id,
        amount: amount,
        modifiers: modifiers || [],
        comment: comment,
        addedBy: from
      }))[0];
    }else{
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
    await Cart.countCart(cart);
    cart.save();
    await emitter.emit.apply(emitter, ['core-cart-after-add-dish', cartDish, ...arguments]);
  },
  removeDish: async function (dish: CartDish, amount: number, stack?: boolean): Promise<void> {
    // TODO: удалить стек
    const emitter = getEmitter();
    await emitter.emit.apply(emitter, ['core-cart-before-remove-dish', ...arguments]);

    const cart = await Cart.findOne({id: this.id}).populate('dishes');

    if (cart.state === "ORDER")
      throw "cart with cartId "+ cart.id + "in state ORDER"

    var cartDish: CartDish;
    if (stack){
      amount = 1;
      cartDish = await CartDish.findOne({where:{cart: cart.id, dish: dish.id}, sort: 'createdAt ASC'}).populate('dish');
    } else {
      cartDish = await CartDish.findOne({cart: cart.id, id: dish.id}).populate('dish');
    }

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
    await Cart.countCart(cart);
    cart.save();
    await emitter.emit.apply(emitter, ['core-cart-after-remove-dish', ...arguments]);
  },
  setCount: async function (dish: CartDish, amount: number): Promise<void> {
    const emitter = getEmitter();
    await emitter.emit.apply(emitter, ['core-cart-before-set-count', ...arguments]);

    if (dish.dish.balance !== -1)
      if (amount > dish.dish.balance) {
        await emitter.emit.apply(emitter, ['core-cart-set-count-reject-amount', ...arguments]);
        throw {body: `There is no so mush dishes with id ${dish.dish.id}`, code: 1};
      }

    const cart = await Cart.findOne(this.id).populate('dishes');
    if (cart.state === "ORDER")
      throw "cart with cartId "+ cart.id + "in state ORDER"

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
      await Cart.countCart(cart);
      cart.save();
      await emitter.emit.apply(emitter, ['core-cart-after-set-count', ...arguments]);
    } else {
      await emitter.emit.apply(emitter, ['core-cart-set-count-reject-no-cartdish', ...arguments]);
      throw {body: `CartDish dish id ${dish.id} not found`, code: 2};
    }
  },
  setComment: async function (dish: CartDish, comment: string): Promise<void> {
    const emitter = getEmitter();
    const self: Cart = this;
    await emitter.emit.apply(emitter, ['core-cart-before-set-comment', ...arguments]);

    const cart = await Cart.findOne(this.id).populate('dishes');
    if (cart.state === "ORDER")
      throw "cart with cartId "+ cart.id + "in state ORDER"

    const cartDish = await CartDish.findOne({cart: cart.id, id: dish.id}).populate('dish');

    if (cartDish) {
      await CartDish.update(cartDish.id, {comment: comment});

      await cart.next('CART');
      await Cart.countCart(self);
      cart.save();
      await emitter.emit.apply(emitter, ['core-cart-after-set-comment', ...arguments]);
    } else {
      await emitter.emit.apply(emitter, ['core-cart-set-comment-reject-no-cartdish', ...arguments]);
      throw {body: `CartDish with id ${dish.id} not found`, code: 1};
    }
  },

  /**
   * Set cart selfService field. Use this method to change selfService.
   * @param selfService
   */
  setSelfService: async function (selfService: boolean): Promise<void> {
    const self: Cart = this;

    sails.log.verbose('Cart > setSelfService >', selfService);

    await actions.reset(this);

    self.selfService = selfService;
    await self.save();
  },
  check: async function (customer?: Customer, isSelfService?: boolean, address?: Address, paymentMethodId?: string): Promise<boolean> {
    const self: Cart  = await Cart.countCart(this);

    if (self.state === "ORDER")
      throw "cart with cartId "+ self.id + "in state ORDER"

    //const self: Cart = this;
    if(self.paid) {
      sails.log.error("CART > Check > error", self.id, "cart is paid");
      return false
    }

    /**
     *  // IDEA Возможно надо добавить параметр Время Жизни  для чека (Сделать глобально понятие ревизии системы int если оно меньше версии чека, то надо проходить чек заново)
     */

    getEmitter().emit('core-cart-before-check', self, customer, isSelfService, address);
    sails.log.debug('Cart > check > before check >', customer, isSelfService, address, paymentMethodId);


    if (customer){
        await checkCustomerInfo(customer);
        self.customer = customer;
    } else {
      if(self.customer === null){
        throw {
          code: 2,
          error: 'customer is required'
        }
      }
    }


    await checkDate(self);

    if(paymentMethodId) {
      await checkPaymentMethod(paymentMethodId);
      self.paymentMethod = paymentMethodId;
      self.paymentMethodTitle = (await PaymentMethod.findOne(paymentMethodId)).title;
      self.isPaymentPromise = await PaymentMethod.isPaymentPromise(paymentMethodId)
    }

    isSelfService = isSelfService === undefined ? false : isSelfService;
    if (isSelfService) {
      getEmitter().emit('core-cart-check-self-service', self, customer, isSelfService, address);
      sails.log.verbose('Cart > check > is self delivery');
      await self.setSelfService(true);
      await self.next('CHECKOUT');
      return true;
    }

    if (address){
        checkAddress(address);
        self.address = address;
    } else {
      if(!isSelfService && self.address === null){
        throw {
          code: 2,
          error: 'address is required'
        }
      }
    }

    getEmitter().emit('core-cart-check-delivery', self, customer, isSelfService, address);

    const results = await getEmitter().emit('core-cart-check', self, customer, isSelfService, address, paymentMethodId);
    await self.save();

    sails.log.info('Cart > check > after wait general emitter', self, results);
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
            await self.next('CHECKOUT');
          }
          return true;
        } else {
          throw {
            code: 10,
            error: 'one or more results from core-cart-check was not sucessed'
          }
        }
      }
      if (checkConfig.notRequired) {
        if (self.getState() !== 'CHECKOUT') {
          await self.next('CHECKOUT');
        }
        return true;
      }
    }
    if (successCount > 0) {
      if (self.getState() !== 'CHECKOUT') {
        await self.next('CHECKOUT');
      }
    }
    return successCount > 0;
  },
  order: async function (): Promise<number> {
    const self: Cart = this;

    if (self.state === "ORDER")
      throw "cart with cartId "+ self.id + "in state ORDER"

    // await self.save();
    // PTODO: проверка эта нужна
    // if(( self.isPaymentPromise && self.paid) || ( !self.isPaymentPromise && !self.paid) )
    //   return 3

    getEmitter().emit('core-cart-before-order', self);
    sails.log.verbose('Cart > order > before order >', self.customer, self.selfService, self.address);

    if (this.selfService) {
      getEmitter().emit('core-cart-order-self-service', self);
    } else {
      getEmitter().emit('core-cart-order-delivery', self);
    }
    await Cart.countCart(self);
    const results = await getEmitter().emit('core-cart-order', self);

    sails.log.verbose('Cart > order > after wait general emitter results: ', results);
    const resultsCount = results.length;
    const successCount = results.filter(r => r.state === "success").length;

    self.orderDate = moment().format("YYYY-MM-DD HH:mm:ss"); // TODO timezone




    const orderConfig = await SystemInfo.use('order');
    if (orderConfig) {
      if (orderConfig.requireAll) {
        if (resultsCount === successCount) {
          order();
          return 0;
        } else if (successCount === 0) {
          return 1;
        } else {
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
    } else {
      return 1;
    }


    async function order(){
      await self.next('ORDER');


      /** Если сохранние модели вызвать до next то будет бесконечный цикл */
      sails.log.info('Cart > order > before save cart', self)
      await self.save();
      getEmitter().emit('core-cart-after-order', self);
    }
  },
  payment: async function (): Promise<PaymentResponse> {
    const self: Cart = this;
    if (self.state === "ORDER")
      throw "cart with cartId "+ self.id + "in state ORDER"

    var paymentResponse: PaymentResponse;
    let comment: string = "";
    var backLinkSuccess: string = (await SystemInfo.use('FrontendOrderPage')) + self.id;
    var backLinkFail: string = await SystemInfo.use('FrontendCheckoutPage');
    let paymentMethodId =  await self.paymentMethodId()
    sails.log.verbose('Cart > payment > before payment register', self);

    var params  = {
      backLinkSuccess: backLinkSuccess,
      backLinkFail: backLinkFail,
      comment: comment
    };
    await Cart.countCart(self);
    await getEmitter().emit('core-cart-payment', self, params);
    sails.log.info("Cart > payment > self before register:", self);
    try {
     paymentResponse = await PaymentDocument.register(self.id, 'cart', self.cartTotal, paymentMethodId, params.backLinkSuccess, params.backLinkFail, params.comment, self)
    } catch (e) {
      getEmitter().emit('error', 'cart>payment', e);
      sails.log.error('Cart > payment: ', e);
    }
    await self.next('PAYMENT');
    return paymentResponse;
  },
  paymentMethodId: async function (cart?: Cart): Promise<string> {
    if (!cart)
      cart = this
    //@ts-ignore
    let populatedCart = await Cart.findOne({id: cart.id}).populate('paymentMethod')
    //@ts-ignore
    return populatedCart.paymentMethod.id;
  }
} as Cart;

let cartModel: CartModel = {
  /**
   * Считает количество, вес и прочие данные о корзине в зависимости от полоенных блюд
   * @param cart
   */
  countCart: async function (cart: Cart) {
    getEmitter().emit('core-cart-before-count', cart);

    if (typeof cart === 'string' || cart instanceof String){
      cart = await Cart.findOne({id: cart});
    } else {
      cart = await Cart.findOne({id: cart.id});
    }

    const cartDishes = await CartDish.find({cart: cart.id}).populate('dish');
    // const cartDishesClone = {};
    // cart.dishes.map(cd => cartDishesClone[cd.id] = _.cloneDeep(cd));

    let orderTotal = 0;
    let dishesCount = 0;
    let uniqueDishes = 0;
    let totalWeight = 0;

    for await(let cartDish of cartDishes){
      try {

        if (cartDish.dish) {
          const dish = await Dish.findOne(cartDish.dish.id);

          // Проверяет что блюдо доступно к продаже
          if (!dish) {
            sails.log.error('Dish with id ' + cartDish.dish.id + ' not found!');
            getEmitter().emit('core-cart-return-full-cart-destroy-cartdish', dish, cart);
            await CartDish.destroy({id: cartDish.dish.id});
            continue;
          }

          if (dish.balance === -1 ? false : dish.balance < cartDish.amount) {
            cartDish.amount = dish.balance;
            getEmitter().emit('core-cartdish-change-amount', cartDish);
            sails.log.debug(`Cart with id ${cart.id} and  CardDish with id ${cartDish.id} amount was changed!`);
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
                continue;
              }

              cartDish.uniqueItems++;
              cartDish.itemTotal += modifier.amount * modifierObj.price;
              cartDish.weight += modifierObj.weight;
            }
          }

          cartDish.totalWeight = cartDish.weight * cartDish.amount;
          cartDish.itemTotal += cartDish.dish.price;
          cartDish.itemTotal *= cartDish.amount;
          await CartDish.update({id: cartDish.id}, cartDish);
        }


        orderTotal += cartDish.itemTotal;
        dishesCount += cartDish.amount;
        uniqueDishes++;
        totalWeight += cartDish.totalWeight;
      } catch (e) {
        sails.log.error('Cart > count > iterate cartDish error', e);
      }
    }

    // for (let cd in cart.dishes) {
    //   if (cart.dishes.hasOwnProperty(cd)) {
    //     const cartDish = cartDishes.find(cd1 => cd1.id === cart.dishes[cd].id);
    //     if (!cartDish)
    //       continue;
    //     cartDish.dish = cartDishesClone[cartDish.id].dish;
    //     //cart.dishes[cd] = cartDish;
    //   }
    // }


    // TODO: здесь точка входа для расчета дискаунтов, т.к. они не должны конкурировать, нужно написать адаптером.
    await getEmitter().emit('core-cart-count-discount-apply', cart);

    cart.dishesCount = dishesCount;
    cart.uniqueDishes = uniqueDishes;
    cart.totalWeight = totalWeight;

    cart.total = orderTotal - cart.discountTotal;
    cart.orderTotal = orderTotal - cart.discountTotal;
    cart.cartTotal = orderTotal + cart.deliveryCost - cart.discountTotal;

    if (cart.delivery) {
      cart.total += cart.delivery;
    }

    const resultCartDishes = await CartDish.find({cart: cart.id}) as Association<CartDish>;
    cart.dishes = resultCartDishes;

    await Cart.update({id: cart.id}, cart);

    getEmitter().emit('core-cart-after-count', cart);

    return cart;
  },

  doPaid: async function (paymentDocument: PaymentDocument) {
    let cart: Cart = await Cart.findOne(paymentDocument.paymentId);
    Cart.countCart(cart);
    try {
      let paymentMethodTitle = (await PaymentMethod.findOne(paymentDocument.paymentMethod)).title;
      await Cart.update({id: paymentDocument.paymentId}, {paid: true, paymentMethod: paymentDocument.paymentMethod, paymentMethodTitle: paymentMethodTitle});

      console.log(">>>>>>",cart);
      console.log(">>>>>>",cart.state, cart.cartTotal, paymentDocument.amount );

      if(cart.state !== "PAYMENT"){
        sails.log.error('Cart > doPaid: is strange cart state is not PAYMENT', cart);
      }

      if(cart.cartTotal !== paymentDocument.amount){
        cart.problem = true;
        cart.comment = cart.comment + " !!! ВНИМАНИЕ, состав заказа был изменен, на счет в банке поступило :" + paymentDocument.amount + " рублей 🤪 !!!"
      }
      await cart.order();
    } catch (e) {
      sails.log.error('Cart > doPaid error: ', e);
      throw e
    }
  },
} as CartModel;









/**
 * Описывает класс Cart, содержит статические методы, используется для ORM
 */
export interface CartModel extends ORMModel<Cart> {
  /**
   * Считает количество, вес и прочие данные о корзине в зависимости от полоенных блюд
   * @param cart
   */
  countCart(cart: Cart);

    /** Выполняет оплату в моделе */
  doPaid(paymentDocument: PaymentDocument): Promise<void>;
}


/**
 * Описывает IIKO  cart
 */
export default interface Cart extends ORM {
  id: string;
  cartId: string;
  state: string;
  shortId: string;
  dishes: Association<CartDish>;
  paymentMethod: string;
  paymentMethodTitle: string;
  paid: boolean;
  isPaymentPromise: boolean;
  dishesCount: number;
  uniqueDishes: number;
  cartTotal: number;
  modifiers: GroupModifier[];
  delivery: number;
  customer: Customer;
  address: Address;
  comment: string;
  personsCount: string;
  orderDateLimit?: string;

  /** Желаемая дата и время доставки */
  date: string;

  problem: boolean;
  rmsDelivered: boolean;
  rmsId: string;
  rmsOrderNumber: string;
  rmsOrderData: any;
  rmsDeliveryDate: string;
  rmsErrorMessage: string;
  rmsErrorCode: string;
  rmsStatusCode: string;
  deliveryStatus: string;
  selfService: boolean;
  deliveryDescription: string;
  message: string;
  deliveryItem: string;
  deliveryCost: number;
  totalWeight: number;
  total: number;
  orderTotal: number;
  orderDate: string;
  discountTotal:number
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
  addDish(dish: Dish | string, amount: number, modifiers?: Modifier[], comment?: string, from?: string, replace?: boolean, cartDishId?: number) : Promise<void>;

  /**
   * Уменьшает количество заданного блюда на amount. Переводит корзину в состояние CART.
   * @param dish - Блюдо для изменения количества блюд
   * @param amount - насколько меньше сделать количество
   * @param stack - параметр позволяющий удалять в обратном хрогологическом порядке
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
  removeDish(dish: CartDish, amount: number, stack?: boolean): Promise<void>;

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
   * Меняет поле корзины selfService на заданное. Используйте только этот метод для изменения параметра selfService.
   * @param selfService
   */
  setSelfService(selfService: boolean): Promise<void>;

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
  check(customer?: Customer, isSelfService?: boolean, address?: Address, paymentMethod?: string): Promise<boolean>;

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

   /**
   * Создает платежный документ от модели Cart.
   * @return код результата:
   *  - 0 - успешно создан платежный документ
   *  - 1 - во время создания платежного документа произошла ошибка валидации
   *  - 2 -
   * @fires cart:core-cart-before-payment - вызывается перед началом функции. Результат подписок игнорируется.
   * @fires cart:core-cart-external-payment - вызывается, если совершается внешняя оплата
   * @fires cart:core-cart-internal-payment - вызывается, если совершается внутренняя оплата
   * @fires cart:core-cart-payment - событие оплаты. Каждый слушатель этого события влияет на результат события.
   * @fires cart:core-cart-after-order - вызывается сразу после попытки провести оплату.
   */
  payment(): Promise<PaymentResponse>;


   /**
   * Возвращает paymentMethodId текущей корзины
   * @param cart
   * @return paymentMethodId
   */
  paymentMethodId(cart?: Cart): Promise<string>

  /**
   * Попытка переключить state корзины
   * @param state Новый стейт
   */
  next(state?: string): Promise<void>

  /**
   * Вернет стейт корзны
   */
  getState(): string
}


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
  if (!address.street ) {
    throw {
      code: 5,
      error: 'address.street  is required'
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

async function checkPaymentMethod(paymentMethodId) {
  if (! await PaymentMethod.checkAvailable(paymentMethodId)) {
    throw {
      code: 8,
      error: 'paymentMethod not available'
    }
  }
}

async function checkDate(cart: Cart) {


  if (cart.date) {
    const date = moment(cart.date, "YYYY-MM-DD HH:mm:ss");
    if (!date.isValid()){
      throw {
        code: 9,
        error: 'date is not valid, required (YYYY-MM-DD HH:mm:ss)'
      }
    }

    const possibleDatetime = await getOrderDateLimit();
    const momentDateLimit = moment(possibleDatetime);
    if (!date.isBefore(momentDateLimit)) {
      throw {
        code: 10,
        error: 'delivery far, far away! allowed not after' + possibleDatetime
      }
    }
  }
}

/**
 * Возвратит максимальное дату и время доставки
 * (по умолчанию 14 дней)
 */
async function getOrderDateLimit(): Promise<string>  {
  let periodPossibleForOrder = await SystemInfo.use('PeriodPossibleForOrder')
  if (periodPossibleForOrder === 0 || periodPossibleForOrder === undefined  || periodPossibleForOrder === null ){
    periodPossibleForOrder = "20160";
  }
  return moment().add(periodPossibleForOrder, 'minutes').format("YYYY-MM-DD HH:mm:ss");
}

// JavaScript merge cart model
cartCollection.attributes = _.merge(cartCollection.attributes, cartInstance);
const finalModel = _.merge(cartCollection, cartModel);
module.exports = finalModel;

declare global {
  const Cart: CartModel;
}


