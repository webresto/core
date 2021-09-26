import { Modifier, GroupModifier } from "../interfaces/Modifier";
import Address from "../interfaces/Address";
import Customer from "../interfaces/Customer";
import CartDish from "./CartDish";
import PaymentDocument from "./PaymentDocument";
import actions from "../libs/actions";
import getEmitter from "../libs/getEmitter";
import ORMModel from "../interfaces/ORMModel";
import ORM from "../interfaces/ORM";
import StateFlowModel from "../interfaces/StateFlowModel";
import {formatDate} from "@webresto/worktime"
import Dish from "./Dish";
import * as _ from "lodash";
import { PaymentResponse } from "../interfaces/Payment";
import { v4 as uuid } from "uuid";
import PaymentMethod from "./PaymentMethod";

const emitter = getEmitter();

let attributes = {
  /** Id  */
  id: "string",

  /** last 8 chars from id */
  shortId: "string",

  /** */
  dishes: {
    collection: "CartDish",
    via: "cart",
  } as unknown as CartDish[] | number[],

  /** */
  discount: "json" as any,
  paymentMethod: {
    model: "PaymentMethod",
  } as unknown as PaymentMethod | any,

  /** */
  paymentMethodTitle: "string",
  paid: {
    type: "boolean",
    defaultsTo: false,
  },

  /** */
  isPaymentPromise: {
    type: "boolean",
    defaultsTo: true,
  } as unknown as boolean,

  /** */
  dishesCount: "number" as unknown as number,
  uniqueDishes: "number" as unknown as number,
  modifiers: "json" as any,
  customer: "json" as any,
  address: "json" as any,
  comment: "string",
  personsCount: "string",

  /** Желаемая дата и время доставки */
  date: "string",

  problem: {
    type: "boolean",
    defaultsTo: false,
  } as unknown as boolean,

  /** */
  rmsDelivered: {
    type: "boolean",
    defaultsTo: false,
  } as unknown as boolean,
  /** */
  rmsId: "string",
  rmsOrderNumber: "string",
  rmsOrderData: "json" as any,
  rmsDeliveryDate: "string",
  rmsErrorMessage: "string",
  rmsErrorCode: "string",
  rmsStatusCode: "string",
  deliveryStatus: "string",

  //state: "string",

  selfService: {
    type: "boolean",
    defaultsTo: false,
  } as unknown as boolean,

  deliveryDescription: {
    type: "string",
    defaultsTo: "",
  } as unknown as string,

  message: "string", // deprecated

  deliveryItem: {
    model: "Dish",
  } as unknown as Dish | any,

  deliveryCost: {
    type: "number",
    defaultsTo: 0,
  } as unknown as number,

  /** cart total weight */
  totalWeight: {
    type: "number",
    defaultsTo: 0,
  } as unknown as number,

  /** total = cartTotal */
  total: {
    type: "number",
    defaultsTo: 0,
  } as unknown as number,

  /**  orderTotal = total + deliveryCost - discountTotal - bonusesTotal */
  orderTotal: {
    type: "number",
    defaultsTo: 0,
  } as unknown as number,

  cartTotal: {
    type: "number",
    defaultsTo: 0,
  } as unknown as number,

  discountTotal: {
    type: "number",
    defaultsTo: 0,
  } as unknown as number,

  orderDate: "string",

  customData: "json" as any,
};

interface stateFlowInstance {
  state: string;
}

type attributes = typeof attributes & stateFlowInstance;
interface Cart extends attributes, ORM {}
export default Cart;

let Model = {
  beforeCreate(cartInit: any, next: any) {
    if (!cartInit.id) {
      cartInit.id = uuid();
    }

    if (!cartInit.shortId) {
      cartInit.shortId = cartInit.id.substr(cartInit.id.length - 8).toUpperCase();
    }

    cartInit = "CART";
    next();
  },

  /** Add dish into cart */
  async addDish(criteria: any, dish: Dish | string, amount: number, modifiers: Modifier[], comment: string, addedBy: string, replace?: boolean, cartDishId?: number): Promise<void> {
    await emitter.emit.apply(emitter, ["core-cart-before-add-dish", ...arguments]);

    let dishObj: Dish;

    if (!addedBy) addedBy = 'user'

    if (typeof dish === "string") {
      dishObj = await Dish.findOne(dish);

      if (!dishObj) {
        throw { body: `Dish with id ${dish} not found`, code: 2 };
      }
    } else {
      dishObj = dish;
    }

    if (dishObj.balance !== -1)
      if (amount > dishObj.balance) {
        await emitter.emit.apply(emitter, ["core-cart-add-dish-reject-amount", ...arguments]);
        throw {
          body: `There is no so mush dishes with id ${dishObj.id}`,
          code: 1,
        };
      }
    const cart = await Cart.findOne(criteria).populate("dishes");

    if (cart.dishes.length > 99) throw "99 max dishes amount";

    if (cart.state === "ORDER") throw "cart with cartId " + cart.id + "in state ORDER";

    if (modifiers && modifiers.length) {
      modifiers.forEach((m: Modifier) => {
        if (!m.amount) m.amount = 1;
      });
    }

    await emitter.emit.apply(emitter, ["core-cart-add-dish-before-create-cartdish", ...arguments]);
    let cartDish: CartDish;

    // auto replace and increase amount if same dishes without modifiers
    if (!replace && (!modifiers || (modifiers && modifiers.length === 0))) {
      let sameCartDishArray = await CartDish.find({
        cart: cart.id,
        dish: dishObj.id,
      });
      for (let sameCartDish of sameCartDishArray) {
        if (sameCartDish && sameCartDish.modifiers && sameCartDish.modifiers.length === 0) {
          cartDishId = Number(sameCartDish.id);
          amount = amount + sameCartDish.amount;
          replace = true;
          break;
        }
      }
    }
    if (replace) {
      cartDish = (
        await CartDish.update(
          { id: cartDishId },
          {
            dish: dishObj.id,
            cart: cart.id,
            amount: amount,
            modifiers: modifiers || [],
            comment: comment,
            addedBy: addedBy,
          }
        ).fetch()
      )[0];
    } else {
      cartDish = await CartDish.create({
        dish: dishObj.id,
        cart: cart.id,
        amount: amount,
        modifiers: modifiers || [],
        comment: comment,
        addedBy: addedBy,
      }).fetch();
    }

    await emitter.emit.apply(emitter, ["core-cart-after-add-dish", cartDish, ...arguments]);
    await Cart.countCart(cart);
    await Cart.next(cart.id, "CART");
  },

  //** Delete dish from cart */
  async removeDish(criteria: any, dish: CartDish, amount: number, stack?: boolean): Promise<void> {
    // TODO: удалить стек

    await emitter.emit.apply(emitter, ["core-cart-before-remove-dish", ...arguments]);

    const cart = await Cart.findOne(criteria).populate("dishes");

    if (cart.state === "ORDER") throw "cart with cartId " + cart.id + "in state ORDER";

    var cartDish: CartDish;
    if (stack) {
      amount = 1;
      cartDish = await CartDish.findOne({
        where: { cart: cart.id, dish: dish.id },
        sort: "createdAt ASC",
      }).populate("dish");
    } else {
      cartDish = await CartDish.findOne({
        cart: cart.id,
        id: dish.id,
      }).populate("dish");
    }

    if (!cartDish) {
      await emitter.emit.apply(emitter, ["core-cart-remove-dish-reject-no-cartdish", ...arguments]);
      throw {
        body: `CartDish with id ${dish.id} in cart with id ${cart.id} not found`,
        code: 1,
      };
    }


    cartDish.amount -= amount;
    if (cartDish.amount > 0) {
      await CartDish.update({ id: cartDish.id }, { amount: cartDish.amount }).fetch();
    } else {
      await CartDish.destroy({ id: cartDish.id }).fetch();;
    }

    await emitter.emit.apply(emitter, ["core-cart-after-remove-dish", ...arguments]);
    await Cart.next(cart.id, "CART");
    await Cart.countCart(cart);
  },

  
  async setCount(criteria: any, dish: CartDish, amount: number): Promise<void> {
    await emitter.emit.apply(emitter, ["core-cart-before-set-count", ...arguments]);

    if (dish.dish.balance !== -1)
      if (amount > dish.dish.balance) {
        await emitter.emit.apply(emitter, ["core-cart-set-count-reject-amount", ...arguments]);
        throw {
          body: `There is no so mush dishes with id ${dish.dish.id}`,
          code: 1,
        };
      }

    const cart = await Cart.findOne(criteria).populate("dishes");
    if (cart.state === "ORDER") throw "cart with cartId " + cart.id + "in state ORDER";

    const cartDishes = await CartDish.find({ cart: cart.id }).populate("dish");
    const get = cartDishes.find((item) => item.id === dish.id);

    if (get) {
      get.amount = amount;
      if (get.amount > 0) {
        await CartDish.update({ id: get.id }, { amount: get.amount }).fetch();
      } else {
        get.destroy();
        sails.log.info("destroy", get.id);
      }

      await Cart.next(cart.id, "CART");
      await Cart.countCart(cart);
      Cart.update({ id: cart.id }, cart).fetch();
      await emitter.emit.apply(emitter, ["core-cart-after-set-count", ...arguments]);
    } else {
      await emitter.emit.apply(emitter, ["core-cart-set-count-reject-no-cartdish", ...arguments]);
      throw { body: `CartDish dish id ${dish.id} not found`, code: 2 };
    }
  },

  async setComment(criteria: any, dish: CartDish, comment: string): Promise<void> {
    await emitter.emit.apply(emitter, ["core-cart-before-set-comment", ...arguments]);

    const cart = await Cart.findOne(criteria).populate("dishes");
    if (cart.state === "ORDER") throw "cart with cartId " + cart.id + "in state ORDER";

    const cartDish = await CartDish.findOne({
      cart: cart.id,
      id: dish.id,
    }).populate("dish");

    if (cartDish) {
      await CartDish.update(cartDish.id, { comment: comment }).fetch();

      await Cart.next(cart.id, "CART");
      await Cart.countCart(cart);
      Cart.update({ id: cart.id }, cart).fetch();
      await emitter.emit.apply(emitter, ["core-cart-after-set-comment", ...arguments]);
    } else {
      await emitter.emit.apply(emitter, ["core-cart-set-comment-reject-no-cartdish", ...arguments]);
      throw { body: `CartDish with id ${dish.id} not found`, code: 1 };
    }
  },

  /**
   * Set cart selfService field. Use this method to change selfService.
   * @param selfService
   */
  async setSelfService(criteria: any, selfService: boolean = true): Promise<Cart> {
    sails.log.verbose("Cart > setSelfService >", selfService);
    const cart = await Cart.findOne(criteria);
    await actions.reset(cart);
    return (await Cart.update(criteria, {selfService: Boolean(selfService)}).fetch())[0];
  },

  ////////////////////////////////////////////////////////////////////////////////////

  async check(criteria: any, customer?: Customer, isSelfService?: boolean, address?: Address, paymentMethodId?: string): Promise<void> {
    const cart: Cart = await Cart.countCart(criteria);

    if (cart.state === "ORDER") throw "cart with cartId " + cart.id + "in state ORDER";

    //const cart: Cart = await Cart.findOne(criteria);
    if (cart.paid) {
      sails.log.error("CART > Check > error", cart.id, "cart is paid");
      throw {
        code: 12,
        error: "cart is paid",
      };
    }

    /**
     *  // IDEA Возможно надо добавить параметр Время Жизни  для чека (Сделать глобально понятие ревизии системы int если оно меньше версии чека, то надо проходить чек заново)
     */

    getEmitter().emit("core-cart-before-check", cart, customer, isSelfService, address);

    sails.log.silly(`Cart > check > before check > ${customer} ${isSelfService} ${address} ${paymentMethodId}`);

    if (customer) {
      await checkCustomerInfo(customer);
      cart.customer = customer;
    } else {
      if (cart.customer === null) {
        throw {
          code: 2,
          error: "customer is required",
        };
      }
    }

    await checkDate(cart);

    if (paymentMethodId) {
      await checkPaymentMethod(paymentMethodId);
      cart.paymentMethod = paymentMethodId;
      cart.paymentMethodTitle = (await PaymentMethod.findOne(paymentMethodId)).title;
      cart.isPaymentPromise = await PaymentMethod.isPaymentPromise(paymentMethodId);
    }

    /** Если самовывоз то не нужно проверять адресс */
    if (isSelfService) {
      getEmitter().emit("core-cart-is-self-service", cart, customer, isSelfService, address);
      await Cart.setSelfService(cart.id, true);
    } else {
      if (address) {
        checkAddress(address);
        cart.address = address;
      } else {
        if (!isSelfService && cart.address === null) {
          throw {
            code: 2,
            error: "address is required",
          };
        }
      }
    }

    getEmitter().emit("core-cart-check-delivery", cart, customer, isSelfService, address);

    const results = await getEmitter().emit("core-cart-check", cart, customer, isSelfService, address, paymentMethodId);

    /** save after updates in emiter */
    await Cart.update({ id: cart.id }, cart).fetch().fetch();

    sails.log.silly("Cart > check > after wait general emitter", cart, results);

    getEmitter().emit("core-cart-after-check", cart, customer, isSelfService, address);

    /** Чек может проходить без слушателей, потомучто минимально сам по себе чек
     *  имеет баовые проверки. И является самодостаточным, но
     * всеже по умолчанию установлено так что нужно пройти все проверки
     */
    const checkConfig = (await Settings.use("check")) as any;

    if (checkConfig && checkConfig.notRequired) {
      if ((await Cart.getState(cart.id)) !== "CHECKOUT") {
        await Cart.next(cart.id, "CHECKOUT");
      }
      return;
    }

    /** Успех во всех слушателях по умолчанию */
    const resultsCount = results.length;
    const successCount = results.filter((r) => r.state === "success").length;
    if (resultsCount === successCount) {
      if ((await Cart.getState(cart.id)) !== "CHECKOUT") {
        await Cart.next(cart.id, "CHECKOUT");
      }
      return;
    } else {
      throw {
        code: 10,
        error: "one or more results from core-cart-check was not sucessed",
      };
    }

    /**
     * Тут поидее должна быть логика успех хотябы одного слушателя, но
     * на текущий момент практического применения не встречалось.
     *
     * if(checkConfig.justOne) ...
     */
  },

  ////////////////////////////////////////////////////////////////////////////////////

  /** Оформление корзины */
  async order(criteria: any): Promise<number> {
    const cart: Cart = await Cart.findOne(criteria);

    if (cart.state === "ORDER") throw "cart with cartId " + cart.id + "in state ORDER";

    // await Cart.update({id: cart.id}).fetch();
    // PTODO: проверка эта нужна
    // if(( cart.isPaymentPromise && cart.paid) || ( !cart.isPaymentPromise && !cart.paid) )
    //   return 3

    getEmitter().emit("core-cart-before-order", cart);
    sails.log.silly("Cart > order > before order >", cart.customer, cart.selfService, cart.address);

    
    if (this.selfService) {
      getEmitter().emit("core-cart-order-self-service", cart);
    } else {
      getEmitter().emit("core-cart-order-delivery", cart);
    }

    await Cart.countCart(cart);
    const results = await getEmitter().emit("core-cart-order", cart);

    sails.log.silly("Cart > order > after wait general emitter results: ", results);
    const resultsCount = results.length;
    const successCount = results.filter((r) => r.state === "success").length;

    const orderConfig = await Settings.use("order");
    if (orderConfig) {
      if (orderConfig.requireAll) {
        if (resultsCount === successCount) {
          await order();
          return;
        } else {
          throw "по крайней мере один слушатель не выполнил заказ.";
        }
      }
      if (orderConfig.justOne) {
        if (successCount > 0) {
          await order();
          return;
        } else {
          throw "ни один слушатель не выполнил заказ";
        }
      }

      throw "Bad orderConfig";
    }

    await order();
    return;

    async function order() {
      // await Cart.next(cart.id,'ORDER');
      // TODO: переписать на stateFlow
      let data: any = {};
      data.orderDate = new Date();
      data.state = "ORDER";

      /** Если сохранние модели вызвать до next то будет бесконечный цикл */
      sails.log.debug("Cart > order > before save cart", cart);
      // await Cart.update({id: cart.id}).fetch();
      await Cart.update({ id: cart.id }, data).fetch();
      getEmitter().emit("core-cart-after-order", cart);
    }
  },
  async payment(criteria: any): Promise<PaymentResponse> {
    const cart: Cart = await Cart.findOne(criteria);
    if (cart.state === "ORDER") throw "cart with cartId " + cart.id + "in state ORDER";

    var paymentResponse: PaymentResponse;
    let comment: string = "";
    var backLinkSuccess: string = (await Settings.use("FrontendOrderPage")) + cart.id;
    var backLinkFail: string = await Settings.use("FrontendCheckoutPage");
    let paymentMethodId = await cart.paymentMethod();
    sails.log.verbose("Cart > payment > before payment register", cart);

    var params = {
      backLinkSuccess: backLinkSuccess,
      backLinkFail: backLinkFail,
      comment: comment,
    };
    await Cart.countCart(cart);
    await getEmitter().emit("core-cart-payment", cart, params);
    sails.log.info("Cart > payment > cart before register:", cart);
    try {
      paymentResponse = await PaymentDocument.register(cart.id, "cart", cart.cartTotal, paymentMethodId, params.backLinkSuccess, params.backLinkFail, params.comment, cart);
    } catch (e) {
      getEmitter().emit("error", "cart>payment", e);
      sails.log.error("Cart > payment: ", e);
    }
    await Cart.next(cart.id, "PAYMENT");
    return paymentResponse;
  },
  async paymentMethodId(criteria: any): Promise<string> {
    let populatedCart = (await Cart.find(criteria).populate("paymentMethod"))[0];
    let paymentMethod = populatedCart.paymentMethod as PaymentMethod
    return paymentMethod.id;
  },

  /**  given populated Cart instance  by criteria*/
  async populate(criteria: any) {
    let cart = await Cart.findOne(criteria);

    if (!cart) throw `cart by criteria: ${criteria},  not found`;

    let fullCart: Cart;
    try {
      fullCart = await Cart.findOne({ id: cart.id }).populate("dishes");
      const cartDishes = await CartDish.find({ cart: cart.id }).populate("dish").sort("createdAt");

      for (let cartDish of cartDishes) {
        if (!cartDish.dish) {
          sails.log.error("cartDish", cartDish.id, "has not dish");
          continue;
        }

        if (!fullCart.dishes.filter((d) => d.id === cartDish.id).length) {
          sails.log.error("cartDish", cartDish.id, "not exists in cart", cart.id);
          continue;
        }

        const dish = await Dish.findOne({
          id: cartDish.dish.id,
          isDeleted: false,
        })
          .populate("images")
          .populate("parentGroup");
        const reason = checkExpression(dish);

        if (dish && dish.parentGroup) var reasonG = checkExpression(dish.parentGroup);

        const reasonBool = reason === "promo" || reason === "visible" || !reason || reasonG === "promo" || reasonG === "visible" || !reasonG;

        await Dish.getDishModifiers(dish);
        cartDish.dish = dish;

        if (cartDish.modifiers !== undefined) {
          for await (let modifier of cartDish.modifiers) {
            modifier.dish = await Dish.findOne(modifier.id);
          }
        }
      }
      fullCart.dishes = cartDishes as Association<CartDish>;

      fullCart.orderDateLimit = await getOrderDateLimit();
      fullCart.cartId = fullCart.id;
      await this.countCart(fullCart);
    } catch (e) {
      sails.log.error("CART > fullCart error", e);
    }

    return fullCart;
  },

  /**
   * Считает количество, вес и прочие данные о корзине в зависимости от полоенных блюд
   * @param cart
   */
  async countCart(criteria: any) {
    let cart: Cart;
    if (typeof criteria === "string" || criteria instanceof String) {
      cart = await Cart.findOne(criteria);
    } else {
      cart = await Cart.findOne(criteria.id);
    }

    getEmitter().emit("core-cart-before-count", cart);

    if (cart.state === "ORDER") throw "cart with cartId " + cart.id + "in state ORDER";

    const cartDishes = await CartDish.find({ cart: cart.id }).populate("dish");
    // const cartDishesClone = {};
    // cart.dishes.map(cd => cartDishesClone[cd.id] = _.cloneDeep(cd));

    let orderTotal = 0;
    let dishesCount = 0;
    let uniqueDishes = 0;
    let totalWeight = 0;

    for await (let cartDish of cartDishes) {
      try {
        if (cartDish.dish) {
          const dish = await Dish.findOne(cartDish.dish.id);

          // Проверяет что блюдо доступно к продаже
          if (!dish) {
            sails.log.error("Dish with id " + cartDish.dish.id + " not found!");
            getEmitter().emit("core-cart-return-full-cart-destroy-cartdish", dish, cart);
            await CartDish.destroy({ id: cartDish.dish.id });
            continue;
          }

          if (dish.balance === -1 ? false : dish.balance < cartDish.amount) {
            cartDish.amount = dish.balance;
            getEmitter().emit("core-cartdish-change-amount", cartDish);
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
                sails.log.error("Dish with id " + modifier.id + " not found!");
                continue;
              }

              await getEmitter().emit("core-cart-countcart-before-calc-modifier", modifier, modifierObj);

              // const modifierCopy = {
              //   amount: modifier.amount,
              //   id: modifier.id
              // }
              // await getEmitter().emit('core-cart-countcart-before-calc-modifier', modifierCopy, modifierObj);

              cartDish.uniqueItems++;
              cartDish.itemTotal += modifier.amount * modifierObj.price;
              cartDish.weight += modifierObj.weight;
            }
          }

          cartDish.totalWeight = cartDish.weight * cartDish.amount;
          cartDish.itemTotal += cartDish.dish.price;
          cartDish.itemTotal *= cartDish.amount;
          cartDish.dish = cartDish.dish.id;
          await CartDish.update({ id: cartDish.id }, cartDish).fetch();
        }

        orderTotal += cartDish.itemTotal;
        dishesCount += cartDish.amount;
        uniqueDishes++;
        totalWeight += cartDish.totalWeight;
      } catch (e) {
        sails.log.error("Cart > count > iterate cartDish error", e);
      }
    }

    // TODO: здесь точка входа для расчета дискаунтов, т.к. они не должны конкурировать, нужно написать адаптером.
    await getEmitter().emit("core-cart-count-discount-apply", cart);

    cart.dishesCount = dishesCount;
    cart.uniqueDishes = uniqueDishes;
    cart.totalWeight = totalWeight;

    cart.total = orderTotal - cart.discountTotal;
    Cart.orderTotal = orderTotal - cart.discountTotal;
    cart.cartTotal = orderTotal + cart.deliveryCost - cart.discountTotal;

    if (cart.delivery) {
      cart.total += cart.delivery;
    }

    const resultCartDishes = await CartDish.find({
      cart: cart.id,
    });

    cart.dishes = resultCartDishes.map((dish) => dish.id);

    await Cart.update({ id: cart.id }, cart).fetch();

    getEmitter().emit("core-cart-after-count", cart);

    return cart;
  },

  async doPaid(criteria: any, paymentDocument: PaymentDocument) {
    let cart: Cart = await Cart.findOne(paymentDocument.paymentId);
    Cart.countCart(cart);
    try {
      let paymentMethodTitle = (await PaymentMethod.findOne(paymentDocument.paymentMethod)).title;
      await Cart.update(
        { id: paymentDocument.paymentId },
        {
          paid: true,
          paymentMethod: paymentDocument.paymentMethod,
          paymentMethodTitle: paymentMethodTitle,
        }
      ).fetch();

      sails.log.info("Cart > doPaid: ", cart.id, cart.state, cart.cartTotal, paymentDocument.amount);

      if (cart.state !== "PAYMENT") {
        sails.log.error("Cart > doPaid: is strange cart state is not PAYMENT", cart);
      }

      if (cart.cartTotal !== paymentDocument.amount) {
        cart.problem = true;
        cart.comment = cart.comment + " !!! ВНИМАНИЕ, состав заказа был изменен, на счет в банке поступило :" + paymentDocument.amount + " рублей 🤪 !!!";
      }
      await Cart.order(cart.id);
    } catch (e) {
      sails.log.error("Cart > doPaid error: ", e);
      throw e;
    }
  },
};

// Waterline model export
module.exports = {
  primaryKey: "id",
  attributes: attributes,
  ...Model,
};

declare global {
  // Typescript export
  const Cart: typeof Model & ORMModel<Cart> & StateFlowModel;
}

// LOCAL HELPERS
/////////////////////////////////////////////////////////////////

async function checkCustomerInfo(customer) {
  if (!customer.name) {
    throw {
      code: 1,
      error: "customer.name is required",
    };
  }
  if (!customer.phone) {
    throw {
      code: 2,
      error: "customer.phone is required",
    };
  }

  try {
    const nameRegex = await Settings.use("nameRegex");
    const phoneRegex = await Settings.use("phoneRegex");

    if (nameRegex) {
      if (!nameRegex.match(customer.name)) {
        throw {
          code: 3,
          error: "customer.name is invalid",
        };
      }
    }
    if (phoneRegex) {
      if (!phoneRegex.match(customer.phone)) {
        throw {
          code: 4,
          error: "customer.phone is invalid",
        };
      }
    }
  } catch (error) {
    sails.log.warn("CART > check user info regex: ", error);
  }
}

function checkAddress(address) {
  if (!address.street) {
    throw {
      code: 5,
      error: "address.street  is required",
    };
  }

  if (!address.home) {
    throw {
      code: 6,
      error: "address.home is required",
    };
  }

  if (!address.city) {
    throw {
      code: 7,
      error: "address.city is required",
    };
  }
}

async function checkPaymentMethod(paymentMethodId) {
  if (!(await PaymentMethod.checkAvailable(paymentMethodId))) {
    throw {
      code: 8,
      error: "paymentMethod not available",
    };
  }
}

async function checkDate(cart: Cart) {
  if (cart.date) {
    const date = new Date(cart.date);

    if (date instanceof Date === true && !date.toJSON()) {
      throw {
        code: 9,
        error: "date is not valid",
      };
    }

    const possibleDatetime = await getOrderDateLimit();
    if (date.getTime() > possibleDatetime.getTime()) {
      throw {
        code: 10,
        error: "delivery far, far away! allowed not after" + possibleDatetime,
      };
    }
  }
}

/**
 * Return Date in future
 * default 1 day
 */

// TODO: refactor periodPossibleForOrder from seconds to full work days
async function getOrderDateLimit(): Promise<Date> {
  let date = new Date();
  let periodPossibleForOrder = await Settings.use("PeriodPossibleForOrder"); //seconds
  if (!periodPossibleForOrder)
    periodPossibleForOrder = 86400;

  date.setSeconds(date.getSeconds() + parseInt(periodPossibleForOrder))
  return date;
}
