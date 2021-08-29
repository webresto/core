import * as Waterline from "waterline";
import { Modifier, GroupModifier } from "../interfaces/Modifier";
import Address from "../interfaces/Address";
import Customer from "../interfaces/Customer";
import CartDish from "./CartDish";
import checkExpression from "../libs/checkExpression";
import PaymentDocument from "./PaymentDocument";
import actions from "../libs/actions";
import getEmitter from "../libs/getEmitter";
import ORMModel from "../interfaces/ORMModel";
import ORM from "../interfaces/ORM";
import Dish from "./Dish";
import * as _ from "lodash";
import { PaymentResponse } from "../interfaces/Payment";
import { v4 as uuid } from "uuid";
import PaymentMethod from "./PaymentMethod";


let Attributes = {
  /** Id  */
  id: {
    type: "string",
    defaultsTo: function () {
      return uuid();
    },
  } as unknown as string,

  /** cartId */
  cartId: "string",
  
  shortId: {
    type: "string",
    defaultsTo: function () {
      return this.id.substr(this.id.length - 8).toUpperCase();
    },
  } as unknown as string,

  /** */
  dishes: {
    collection: "CartDish",
    via: "cart",
  } as unknown as Association<CartDish>,

  /** */
  discount: "json" as any,
  paymentMethod: {
    model: "PaymentMethod",
    via: "id",
  } as unknown as Association<PaymentMethod>,

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
  },

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
  } as unknown as Association<Dish>,

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
  }as unknown as number, 

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

type Cart = typeof Attributes
export default Cart



let Model = {
  async addDish(
    criteria: any,
    dish: Dish | string,
    amount: number,
    modifiers: Modifier[],
    comment: string,
    from: string,
    replace: boolean,
    cartDishId: number
  ): Promise<void> {
    const emitter = getEmitter();
    await emitter.emit.apply(emitter, [
      "core-cart-before-add-dish",
      ...arguments,
    ]);

    let dishObj: Dish;
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
        await emitter.emit.apply(emitter, [
          "core-cart-add-dish-reject-amount",
          ...arguments,
        ]);
        throw {
          body: `There is no so mush dishes with id ${dishObj.id}`,
          code: 1,
        };
      }
    const cart = await Cart.findOne({ id: this.id }).populate("dishes");

    if (cart.dishes.length > 99) throw "99 max dishes amount";

    if (cart.state === "ORDER")
      throw "cart with cartId " + cart.id + "in state ORDER";

    if (modifiers && modifiers.length) {
      modifiers.forEach((m: Modifier) => {
        if (!m.amount) m.amount = 1;
      });
    }

    await emitter.emit.apply(emitter, [
      "core-cart-add-dish-before-create-cartdish",
      ...arguments,
    ]);
    let cartDish: CartDish;

    // auto replace and increase amount if same dishes without modifiers
    if (!replace && (!modifiers || (modifiers && modifiers.length === 0))) {
      let sameCartDishArray = await CartDish.find({
        cart: this.id,
        dish: dishObj.id,
      });
      for (let sameCartDish of sameCartDishArray) {
        if (
          sameCartDish &&
          sameCartDish.modifiers &&
          sameCartDish.modifiers.length === 0
        ) {
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
            cart: this.id,
            amount: amount,
            modifiers: modifiers || [],
            comment: comment,
            addedBy: from,
          }
        )
      )[0];
    } else {
      cartDish = await CartDish.create({
        dish: dishObj.id,
        cart: this.id,
        amount: amount,
        modifiers: modifiers || [],
        comment: comment,
        addedBy: from,
      });
    }

    await Cart.next("CART");
    await Cart.countCart(cart.id, cart);
    cart.save();
    await emitter.emit.apply(emitter, [
      "core-cart-after-add-dish",
      cartDish,
      ...arguments,
    ]);
  },
  async removeDish(
    criteria: any,
    dish: CartDish,
    amount: number,
    stack?: boolean
  ): Promise<void> {
    // TODO: удалить стек
    const emitter = getEmitter();
    await emitter.emit.apply(emitter, [
      "core-cart-before-remove-dish",
      ...arguments,
    ]);

    const cart = await Cart.findOne({ id: this.id }).populate("dishes");

    if (cart.state === "ORDER")
      throw "cart with cartId " + cart.id + "in state ORDER";

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
      await emitter.emit.apply(emitter, [
        "core-cart-remove-dish-reject-no-cartdish",
        ...arguments,
      ]);
      throw {
        body: `CartDish with id ${dish.id} in cart with id ${this.id} not found`,
        code: 1,
      };
    }

    const get = cartDish;
    get.amount -= amount;
    if (get.amount > 0) {
      await CartDish.update({ id: get.id }, { amount: get.amount });
    } else {
      get.destroy();
    }

    await Cart.next("CART");
    await Cart.countCart(cart.id, cart);
    cart.save();
    await emitter.emit.apply(emitter, [
      "core-cart-after-remove-dish",
      ...arguments,
    ]);
  },
  async setCount(criteria: any, dish: CartDish, amount: number): Promise<void> {
    const emitter = getEmitter();
    await emitter.emit.apply(emitter, [
      "core-cart-before-set-count",
      ...arguments,
    ]);

    if (dish.dish.balance !== -1)
      if (amount > dish.dish.balance) {
        await emitter.emit.apply(emitter, [
          "core-cart-set-count-reject-amount",
          ...arguments,
        ]);
        throw {
          body: `There is no so mush dishes with id ${dish.dish.id}`,
          code: 1,
        };
      }

    const cart = await Cart.findOne(this.id).populate("dishes");
    if (cart.state === "ORDER")
      throw "cart with cartId " + cart.id + "in state ORDER";

    const cartDishes = await CartDish.find({ cart: cart.id }).populate("dish");
    const get = cartDishes.find((item) => item.id === dish.id);

    if (get) {
      get.amount = amount;
      if (get.amount > 0) {
        await CartDish.update({ id: get.id }, { amount: get.amount });
      } else {
        get.destroy();
        sails.log.info("destroy", get.id);
      }

      await Cart.next("CART");
      await Cart.countCart(cart.id, cart);
      cart.save();
      await emitter.emit.apply(emitter, [
        "core-cart-after-set-count",
        ...arguments,
      ]);
    } else {
      await emitter.emit.apply(emitter, [
        "core-cart-set-count-reject-no-cartdish",
        ...arguments,
      ]);
      throw { body: `CartDish dish id ${dish.id} not found`, code: 2 };
    }
  },
  async setComment(
    criteria: any,
    dish: CartDish,
    comment: string
  ): Promise<void> {
    const emitter = getEmitter();
    const self: Cart = this;
    await emitter.emit.apply(emitter, [
      "core-cart-before-set-comment",
      ...arguments,
    ]);

    const cart = await Cart.findOne(this.id).populate("dishes");
    if (cart.state === "ORDER")
      throw "cart with cartId " + cart.id + "in state ORDER";

    const cartDish = await CartDish.findOne({
      cart: cart.id,
      id: dish.id,
    }).populate("dish");

    if (cartDish) {
      await CartDish.update(cartDish.id, { comment: comment });

      await Cart.next("CART");
      await Cart.countCart(cart.id, self);
      cart.save();
      await emitter.emit.apply(emitter, [
        "core-cart-after-set-comment",
        ...arguments,
      ]);
    } else {
      await emitter.emit.apply(emitter, [
        "core-cart-set-comment-reject-no-cartdish",
        ...arguments,
      ]);
      throw { body: `CartDish with id ${dish.id} not found`, code: 1 };
    }
  },

  /**
   * Set cart selfService field. Use this method to change selfService.
   * @param selfService
   */
  async setSelfService(criteria: any, selfService: boolean): Promise<void> {
    const self: Cart = this;

    sails.log.verbose("Cart > setSelfService >", selfService);

    await actions.reset(this);

    self.selfService = selfService;
    await self.save();
  },
  async check(
    criteria: any,
    customer?: Customer,
    isSelfService?: boolean,
    address?: Address,
    paymentMethodId?: string
  ): Promise<any> {
    const self: Cart = await Cart.countCart(cart.id, this);

    if (self.state === "ORDER")
      throw "cart with cartId " + self.id + "in state ORDER";

    //const self: Cart = this;
    if (self.paid) {
      sails.log.error("CART > Check > error", self.id, "cart is paid");
      throw {
        code: 12,
        error: "cart is paid",
      };
    }

    /**
     *  // IDEA Возможно надо добавить параметр Время Жизни  для чека (Сделать глобально понятие ревизии системы int если оно меньше версии чека, то надо проходить чек заново)
     */

    getEmitter().emit(
      "core-cart-before-check",
      self,
      customer,
      isSelfService,
      address
    );
    sails.log.debug(
      "Cart > check > before check >",
      customer,
      isSelfService,
      address,
      paymentMethodId
    );

    if (customer) {
      await checkCustomerInfo(customer);
      self.customer = customer;
    } else {
      if (self.customer === null) {
        throw {
          code: 2,
          error: "customer is required",
        };
      }
    }

    await checkDate(self);

    if (paymentMethodId) {
      await checkPaymentMethod(paymentMethodId);
      self.paymentMethod = paymentMethodId;
      self.paymentMethodTitle = (
        await PaymentMethod.findOne(paymentMethodId)
      ).title;
      self.isPaymentPromise = await PaymentMethod.isPaymentPromise(
        paymentMethodId
      );
    }

    isSelfService = isSelfService === undefined ? false : isSelfService;
    if (isSelfService) {
      getEmitter().emit(
        "core-cart-check-self-service",
        self,
        customer,
        isSelfService,
        address
      );
      sails.log.verbose("Cart > check > is self delivery");
      await self.setSelfService(true);
      await self.next("CHECKOUT");
      return;
    }

    if (address) {
      checkAddress(address);
      self.address = address;
    } else {
      if (!isSelfService && self.address === null) {
        throw {
          code: 2,
          error: "address is required",
        };
      }
    }

    getEmitter().emit(
      "core-cart-check-delivery",
      self,
      customer,
      isSelfService,
      address
    );

    const results = await getEmitter().emit(
      "core-cart-check",
      self,
      customer,
      isSelfService,
      address,
      paymentMethodId
    );
    await self.save();

    sails.log.info("Cart > check > after wait general emitter", self, results);
    const resultsCount = results.length;
    const successCount = results.filter((r) => r.state === "success").length;

    getEmitter().emit(
      "core-cart-after-check",
      self,
      customer,
      isSelfService,
      address
    );

    if (resultsCount === 0) return;

    const checkConfig = await Settings.use("check");

    if (checkConfig) {
      if (checkConfig.requireAll) {
        if (resultsCount === successCount) {
          if (self.getState() !== "CHECKOUT") {
            await self.next("CHECKOUT");
          }
          return;
        } else {
          throw {
            code: 10,
            error: "one or more results from core-cart-check was not sucessed",
          };
        }
      }
      if (checkConfig.notRequired) {
        if (self.getState() !== "CHECKOUT") {
          await self.next("CHECKOUT");
        }
        return;
      }
    }
    // если не настроен конфиг то нужен хотябы один положительный ответ(заказ в пустоту бесполезен)
    if (successCount > 0) {
      if (self.getState() !== "CHECKOUT") {
        await self.next("CHECKOUT");
      }
      return;
    } else {
      throw {
        code: 11,
        error: "successCount <= 0",
      };
    }
  },
  async order(criteria: any): Promise<number> {
    const self: Cart = this;

    if (self.state === "ORDER")
      throw "cart with cartId " + self.id + "in state ORDER";

    // await self.save();
    // PTODO: проверка эта нужна
    // if(( self.isPaymentPromise && self.paid) || ( !self.isPaymentPromise && !self.paid) )
    //   return 3

    getEmitter().emit("core-cart-before-order", self);
    sails.log.silly(
      "Cart > order > before order >",
      self.customer,
      self.selfService,
      self.address
    );

    if (this.selfService) {
      getEmitter().emit("core-cart-order-self-service", self);
    } else {
      getEmitter().emit("core-cart-order-delivery", self);
    }
    await Cart.countCart(cart.id, self);
    const results = await getEmitter().emit("core-cart-order", self);

    sails.log.silly(
      "Cart > order > after wait general emitter results: ",
      results
    );
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
      // await self.next('ORDER');
      // TODO: переписать на stateFlow
      let data: any = {};
      data.orderDate = moment().format("YYYY-MM-DD HH:mm:ss"); // TODO timezone
      data.state = "ORDER";

      /** Если сохранние модели вызвать до next то будет бесконечный цикл */
      sails.log.info("Cart > order > before save cart", self);
      // await self.save();
      await Cart.update({ id: self.id }, data);
      getEmitter().emit("core-cart-after-order", self);
    }
  },
  async payment(criteria: any): Promise<PaymentResponse> {
    const self: Cart = this;
    if (self.state === "ORDER")
      throw "cart with cartId " + self.id + "in state ORDER";

    var paymentResponse: PaymentResponse;
    let comment: string = "";
    var backLinkSuccess: string =
      (await Settings.use("FrontendOrderPage")) + self.id;
    var backLinkFail: string = await Settings.use("FrontendCheckoutPage");
    let paymentMethodId = await self.paymentMethodId();
    sails.log.verbose("Cart > payment > before payment register", self);

    var params = {
      backLinkSuccess: backLinkSuccess,
      backLinkFail: backLinkFail,
      comment: comment,
    };
    await Cart.countCart(cart.id, self);
    await getEmitter().emit("core-cart-payment", self, params);
    sails.log.info("Cart > payment > self before register:", self);
    try {
      paymentResponse = await PaymentDocument.register(
        self.id,
        "cart",
        self.cartTotal,
        paymentMethodId,
        params.backLinkSuccess,
        params.backLinkFail,
        params.comment,
        self
      );
    } catch (e) {
      getEmitter().emit("error", "cart>payment", e);
      sails.log.error("Cart > payment: ", e);
    }
    await self.next("PAYMENT");
    return paymentResponse;
  },
  async paymentMethodId(criteria: any, cart?: Cart): Promise<string> {
    if (!cart) cart = this;
    //@ts-ignore
    let populatedCart = await Cart.findOne({ id: cart.id }).populate(
      "paymentMethod"
    );
    //@ts-ignore
    return populatedCart.paymentMethod.id;
  },
  /**
   * Считает количество, вес и прочие данные о корзине в зависимости от полоенных блюд
   * @param cart
   */
  async countCart(criteria: any, cart: Cart) {
    getEmitter().emit("core-cart-before-count", cart);

    if (typeof cart === "string" || cart instanceof String) {
      cart = await Cart.findOne({ id: cart });
    } else {
      cart = await Cart.findOne({ id: cart.id });
    }

    if (cart.state === "ORDER")
      throw "cart with cartId " + cart.id + "in state ORDER";

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
            getEmitter().emit(
              "core-cart-return-full-cart-destroy-cartdish",
              dish,
              cart
            );
            await CartDish.destroy({ id: cartDish.dish.id });
            continue;
          }

          if (dish.balance === -1 ? false : dish.balance < cartDish.amount) {
            cartDish.amount = dish.balance;
            getEmitter().emit("core-cartdish-change-amount", cartDish);
            sails.log.debug(
              `Cart with id ${cart.id} and  CardDish with id ${cartDish.id} amount was changed!`
            );
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

              await getEmitter().emit(
                "core-cart-countcart-before-calc-modifier",
                modifier,
                modifierObj
              );

              cartDish.uniqueItems++;
              cartDish.itemTotal += modifier.amount * modifierObj.price;
              cartDish.weight += modifierObj.weight;
            }
          }

          cartDish.totalWeight = cartDish.weight * cartDish.amount;
          cartDish.itemTotal += cartDish.dish.price;
          cartDish.itemTotal *= cartDish.amount;
          await CartDish.update({ id: cartDish.id }, cartDish);
        }

        orderTotal += cartDish.itemTotal;
        dishesCount += cartDish.amount;
        uniqueDishes++;
        totalWeight += cartDish.totalWeight;
      } catch (e) {
        sails.log.error("Cart > count > iterate cartDish error", e);
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

    const resultCartDishes = (await CartDish.find({
      cart: cart.id,
    })) as Association<CartDish>;
    cart.dishes = resultCartDishes;

    await Cart.update({ id: cart.id }, cart);

    getEmitter().emit("core-cart-after-count", cart);

    return cart;
  },

  async doPaid(criteria: any, paymentDocument: PaymentDocument) {
    let cart: Cart = await Cart.findOne(paymentDocument.paymentId);
    Cart.countCart(cart.id, cart);
    try {
      let paymentMethodTitle = (
        await PaymentMethod.findOne(paymentDocument.paymentMethod)
      ).title;
      await Cart.update(
        { id: paymentDocument.paymentId },
        {
          paid: true,
          paymentMethod: paymentDocument.paymentMethod,
          paymentMethodTitle: paymentMethodTitle,
        }
      );

      sails.log.info(
        "Cart > doPaid: ",
        cart.id,
        cart.state,
        cart.cartTotal,
        paymentDocument.amount
      );

      if (cart.state !== "PAYMENT") {
        sails.log.error(
          "Cart > doPaid: is strange cart state is not PAYMENT",
          cart
        );
      }

      if (cart.cartTotal !== paymentDocument.amount) {
        cart.problem = true;
        cart.comment =
          cart.comment +
          " !!! ВНИМАНИЕ, состав заказа был изменен, на счет в банке поступило :" +
          paymentDocument.amount +
          " рублей 🤪 !!!";
      }
      await Cart.order(cart.id);
    } catch (e) {
      sails.log.error("Cart > doPaid error: ", e);
      throw e;
    }
  },
};

// Waterline model export
module.exports  = {
  primaryKey: "id",
  attributes: Attributes,
  ...Model,
}

declare global {
  // Typescript export
  const Cart: typeof Model & ORMModel<Cart>;
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
    const date = moment(cart.date, "YYYY-MM-DD HH:mm:ss");
    if (!date.isValid()) {
      throw {
        code: 9,
        error: "date is not valid, required (YYYY-MM-DD HH:mm:ss)",
      };
    }

    const possibleDatetime = await getOrderDateLimit();
    const momentDateLimit = moment(possibleDatetime);
    if (!date.isBefore(momentDateLimit)) {
      throw {
        code: 10,
        error: "delivery far, far away! allowed not after" + possibleDatetime,
      };
    }
  }
}

/**
 * Возвратит максимальное дату и время доставки
 * (по умолчанию 14 дней)
 */
async function getOrderDateLimit(): Promise<string> {
  let periodPossibleForOrder = await Settings.use("PeriodPossibleForOrder");
  if (
    periodPossibleForOrder === 0 ||
    periodPossibleForOrder === undefined ||
    periodPossibleForOrder === null
  ) {
    periodPossibleForOrder = "20160";
  }
  return moment()
    .add(periodPossibleForOrder, "minutes")
    .format("YYYY-MM-DD HH:mm:ss");
}
