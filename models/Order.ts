import { Modifier, OrderModifier } from "../interfaces/Modifier";
import Address from "../interfaces/Address";
import Customer from "../interfaces/Customer";
import OrderDish from "./OrderDish";
import PaymentDocument from "./PaymentDocument";
import Maintenance from "./Maintenance"
import { ORMModel, CriteriaQuery } from "../interfaces/ORMModel";
import ORM from "../interfaces/ORM";
import StateFlowModel from "../interfaces/StateFlowModel";
import Dish from "./Dish";
import Place from "./Place";
import User from "./User";
import { PaymentResponse } from "../interfaces/Payment";
import { v4 as uuid } from "uuid";
import PaymentMethod from "./PaymentMethod";
import { OptionalAll } from "../interfaces/toolsTS";
import { SpendBonus } from "../interfaces/SpendBonus";
import Decimal from "decimal.js";
import { Delivery } from "../adapters/delivery/DeliveryAdapter";
import AbstractPromotionAdapter from "../adapters/promotion/AbstractPromotionAdapter";
import PromotionCode from "./PromotionCode";
import { phoneValidByMask } from "../libs/phoneValidByMask";

export interface PromotionState {
  type: string;
  message: string;
  state: any;
}
let attributes = {
  /** Id  */
  id: {
    type: "string",
  } as unknown as string,

  /** last 8 chars from id */
  shortId: "string",

  /** Stateflow field */
  state: "string",

  /** Concept string */
  // TODO: rework type to string[]
  concept: "string",
  // concept: {
  //   type: "json",
  // } as unknown as string[],

  /** the basket contains mixed types of concepts */
  isMixedConcept: "boolean" as unknown as boolean,

  /**
   * @deprecated will be rename to `Items` in **v2**
   */
  dishes: {
    collection: "OrderDish",
    via: "order",
  } as unknown as OrderDish[] | number[],

  // /** */
  // discount: "json" as any,
  paymentMethod: {
    model: "PaymentMethod",
  } as unknown as PaymentMethod | any,

  /** */
  paymentMethodTitle: "string",
  paid: {
    type: "boolean",
    defaultsTo: false,
  } as unknown as boolean,

  /** */
  isPaymentPromise: {
    type: "boolean",
    defaultsTo: true,
  } as unknown as boolean,

  /**
   * The property displays the state of promotion.
   * In order to understand what was happening with the order in the adapter of promoters.
   * 
   * This property can be used to portray the representations of promotions at the front 
   */
  promotionState: {
    type: "json"
  } as unknown as PromotionState[],

  /**
   * hidden in api
   */
  promotionCode: {
    model: "promotionCode",
  } as unknown as PromotionCode | string,

  promotionCodeDescription: {
    type: "string",
    allowNull: true
  } as unknown as string,

  promotionCodeString: {
    type: "string",
    allowNull: true
  } as unknown as string,

  /**
   * The discount will be applied to basketTotal during countCart
   * This will be cleared before passing promotions count
   */
  promotionFlatDiscount: {
    type: "number",
    defaultsTo: 0,
  } as unknown as number,

  /**
   * Promotion may estimate shipping costs and if this occurs,
   * then the calculation of delivery through the adapter will be ignored.
   */
  promotionDelivery: {
    type: "json"
  } as unknown as Delivery,

  /**
  * The user's locale is a priority, the cart locale may not be installed, then the default locale of the site will be selected.
  locale: { 
    type: "string",
    // isIn:  todo
    allowNull: true
  } as unknown as string,
  */

  /**
   * Date untill promocode is valid
   * This need for calculate promotion in realtime without request in DB
   */
  promotionCodeCheckValidTill: {
    type: "string",
    allowNull: true
  } as unknown as string,

  /**
   * If you set this field through promotion, then the order will not be possible to order
   */
  promotionUnorderable: {
    type: "boolean",
  } as unknown as boolean,


  /**
   ** Means that the basket was modified by the adapter,
   * It also prevents the repeat call of the action of the handler of the handler
   * */
  isPromoting: {
    type: "boolean"
  } as unknown as boolean,

  /** */
  dishesCount: "number" as unknown as number,
  uniqueDishes: "number" as unknown as number,
  modifiers: "json" as any,
  customer: "json" as any,
  address: "json" as unknown as Address,
  comment: "string",
  personsCount: "string",

  /** The desired date and delivery time*/
  date: {
    type: "string",
    allowNull: true
  } as unknown as string,

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

  pickupPoint: {
    model: "Place",
  } as unknown as Place | string,

  selfService: {
    type: "boolean",
    defaultsTo: false,
  } as unknown as boolean,


  delivery: {
    type: "json"
  } as unknown as Delivery | null,

  /** Notification about delivery 
   * ex: time increased due to traffic jams 
   * @deprecated should changed for order.delivery.message
   * */
  deliveryDescription: {
    type: "string",
    allowNull: true
  } as unknown as string,

  message: "string", // deprecated

  /**
   * @deprecated use order.delivery.item
   */
  deliveryItem: {
    model: "Dish",
  } as unknown as Dish | string,


  /**
   * @deprecated use order.delivery.cost
   */
  deliveryCost: {
    type: "number",
    defaultsTo: 0,
  } as unknown as number,

  /** order total weight */
  totalWeight: {
    type: "number",
    defaultsTo: 0,
  } as unknown as number,

  /** Сдача */
  trifleFrom: {
    type: "number",
    defaultsTo: 0,
  } as unknown as number,


  /** Summ of all bobnuses */
  bonusesTotal: {
    type: "number",
    defaultsTo: 0,
  } as unknown as number,

  spendBonus: {
    type: "json"
  } as unknown as SpendBonus,


  /** total = basketTotal + deliveryCost - discountTotal - bonusesTotal */
  total: {
    type: "number",
    defaultsTo: 0,
  } as unknown as number,

  /** 
    * Sum dishes user added 
    */
  basketTotal: {
    type: "number",
    defaultsTo: 0,
  } as unknown as number,

  /** 
  *   @deprecated orderTotal use basketTotal
  */
  orderTotal: {
    type: "number",
    defaultsTo: 0,
  } as unknown as number,

  /**
   * Calculated discount, not recomend for changing
   */
  discountTotal: {
    type: "number",
    defaultsTo: 0,
  } as unknown as number,

  orderDate: "string",
  // orderDateLimit: "string",

  deviceId: "string",

  user: {
    model: "user",
  } as unknown as User | string,

  customData: "json" as any,
};

interface stateFlowInstance {
  state: string;
}

type attributes = typeof attributes & stateFlowInstance;
interface Order extends ORM, OptionalAll<attributes> { }

export default Order;

let Model = {
  beforeCreate(orderInit: Order, cb: (err?: string) => void) {
    if (!orderInit.id) {
      orderInit.id = uuid();
    }

    if (!orderInit.shortId) {
      orderInit.shortId = orderInit.id.substr(orderInit.id.length - 8).toUpperCase();
    }

    orderInit.promotionState = []

    orderInit.state = "CART";
    cb();
  },

  async afterCreate(order: Order, cb: (err?: string) => void) {
    /**
     * It was decided to add ORDER_INIT_PRODUCT_ID when creating a cart here to unify the core functionality for marketing.
     * This creates redundancy in the kernel. But in the current version we will try to run the kernel in this way. Until we switch to stateflow
     *
     *  @setting: ORDER_INIT_PRODUCT_ID - Adds a dish to the cart that the user cannot remove, he can only modify it
     */

    const ORDER_INIT_PRODUCT_ID = await Settings.get("ORDER_INIT_PRODUCT_ID") as string;
    if (Boolean(ORDER_INIT_PRODUCT_ID)) {
      const ORDER_INIT_PRODUCT = (await Dish.find({ where: { or: [{ id: ORDER_INIT_PRODUCT_ID }, { rmsId: ORDER_INIT_PRODUCT_ID }] } }).limit(1))[0];
      if (ORDER_INIT_PRODUCT !== undefined) {
        await Order.addDish({ id: order.id }, ORDER_INIT_PRODUCT, 1, [], "", "core")
      }
    }
    cb();
  },

  /** Add dish into order */
  async addDish(
    criteria: CriteriaQuery<Order>,
    dish: Dish | string,
    amount: number,
    modifiers: OrderModifier[],
    comment: string,
    /**
     * user - added manualy by human
     * promotion - cleaned in each calculate promotions
     * core - is reserved for 
     * custom - custom integration can process it
     */
    addedBy: "user" | "promotion" | "core" | "custom",
    replace?: boolean,
    orderDishId?: number
  ): Promise<void> {
    await emitter.emit.apply(emitter, ["core-order-before-add-dish", ...arguments]);

    // TODO: when user add some dish to PAYMENT || ORDER cart state, need just make new cart clone 

    let dishObj: Dish;

    if (!addedBy) addedBy = "user";

    if (typeof dish === "string") {
      dishObj = (await Dish.find({ id: dish }).limit(1))[0];

      if (!dishObj) {
        throw { body: `Dish with id ${dish} not found`, code: 2 };
      }
    } else {
      dishObj = dish;
    }


    // TODO: In core you can add any amount dish, only in checkout it should show which not allowed
    if (dishObj.balance !== -1) {
      if (amount > dishObj.balance) {
        await emitter.emit.apply(emitter, ["core-order-add-dish-reject-amount", ...arguments]);
        console.error({
          body: `There is no so mush dishes with id ${dishObj.id}`,
          code: 1,
        });
      }
    }

    if (dishObj.modifier) {
      throw new Error(`Dish [${dishObj.id}] is modifier`)
    }

    /**
     * Add defuaul modifiers in add
     */
    const dishModifiers = dishObj.modifiers;
    dishModifiers.forEach(group => {
      if (group.childModifiers) {
        group.childModifiers.forEach(modifier => {
          if (modifier.defaultAmount) {
            const modifierIsAddaed = modifiers.find(m => m.id === modifier.id)
            if (!modifierIsAddaed) {
              modifiers.push(
                {
                  id: modifier.id,
                  amount: modifier.defaultAmount
                }
              )
            }
          }
        })
      }
    })

    let order = await Order.findOne(criteria).populate("dishes");

    if (order.dishes.length > 99) throw "99 max dishes amount";

    if (order.state === "ORDER") throw "order with orderId " + order.id + "in state ORDER";

    if (modifiers && modifiers.length) {
      modifiers.forEach((m: OrderModifier) => {
        if (m.amount === undefined) m.amount = 1;
      });
    } else {
      modifiers = [];
    }

    await emitter.emit.apply(emitter, ["core-order-add-dish-before-create-orderdish", ...arguments]);


    /**
     * @setting: ONLY_CONCEPTS_DISHES - Prevents ordering from origin concept
     */
    const ONLY_CONCEPTS_DISHES = await Settings.get('ONLY_CONCEPTS_DISHES')
    if (ONLY_CONCEPTS_DISHES && dishObj.concept === 'origin') {
      throw { body: `Dish ${dishObj.name} (${dishObj.id}) from [${dishObj.concept}] concept, but ONLY_CONCEPTS_DISHES setting is: ${ONLY_CONCEPTS_DISHES}`, code: 1 };
    }


    /**
    * @setting: CORE_SEPARATE_CONCEPTS_ORDERS - Prevents ordering in the same cart from different concepts
    */
    const SEPARATE_CONCEPTS_ORDERS = await Settings.get('SEPARATE_CONCEPTS_ORDERS')

    if (SEPARATE_CONCEPTS_ORDERS && order.concept && order.concept !== dishObj.concept) {
      throw { body: `Dish ${dishObj.name} not in same concept as cart`, code: 1 };
    } else if (SEPARATE_CONCEPTS_ORDERS && order.dishes.length === 0) {
      await Order.update({ id: order.id }, { concept: dishObj.concept })
    }


    let orderDish: OrderDish;

    // auto replace and increase amount if same dishes without modifiers
    if (!replace && (!modifiers || (modifiers && modifiers.length === 0))) {
      let sameOrderDishArray = await OrderDish.find({
        order: order.id,
        dish: dishObj.id,
      });

      for (let sameOrderDish of sameOrderDishArray) {
        if (sameOrderDish && sameOrderDish.modifiers && sameOrderDish.modifiers.length === 0) {
          orderDishId = Number(sameOrderDish.id);
          amount = amount + sameOrderDish.amount;
          replace = true;
          break;
        }
      }

    }

    if (replace) {
      orderDish = (
        await OrderDish.update(
          { id: orderDishId },
          {
            dish: dishObj.id,
            order: order.id,
            amount: amount,
            modifiers: modifiers,
            comment: comment,
            addedBy: addedBy,
          }
        ).fetch()
      )[0];
    } else {
      orderDish = await OrderDish.create({
        dish: dishObj.id,
        order: order.id,
        amount: amount,
        modifiers: modifiers,
        comment: comment,
        addedBy: addedBy
      }).fetch();
    }

    await emitter.emit.apply(emitter, ["core-order-after-add-dish", orderDish, ...arguments]);

    try {
      await Order.countCart({ id: order.id });
      await Order.next(order.id, "CART");
    } catch (error) {
      sails.log.error(error)
      throw error
    }
  },

  //** Delete dish from order */
  async removeDish(criteria: CriteriaQuery<Order>, dish: OrderDish, amount: number, stack?: boolean): Promise<void> {
    // TODO: delete stack

    await emitter.emit.apply(emitter, ["core-order-before-remove-dish", ...arguments]);

    const order = await Order.findOne(criteria).populate("dishes");

    if (order.state === "ORDER") throw "order with orderId " + order.id + "in state ORDER";

    var orderDish: OrderDish;
    if (stack) {
      amount = 1;
      orderDish = await OrderDish.findOne({
        where: { order: order.id, dish: dish.dish },
        sort: "createdAt ASC",
      }).populate("dish");
    } else {
      orderDish = await OrderDish.findOne({
        order: order.id,
        id: dish.id,
      }).populate("dish");
    }

    if (!orderDish) {
      await emitter.emit.apply(emitter, ["core-order-remove-dish-reject-no-orderdish", ...arguments]);
      throw {
        body: `OrderDish with id ${dish.id} in order with id ${order.id} not found`,
        code: 1,
      };
    }

    orderDish.amount -= amount;
    if (orderDish.amount > 0) {
      await OrderDish.update({ id: orderDish.id }, { amount: orderDish.amount }).fetch();
    } else {
      await OrderDish.destroy({ id: orderDish.id }).fetch();
    }

    await emitter.emit.apply(emitter, ["core-order-after-remove-dish", ...arguments]);
    await Order.next(order.id, "CART");
    await Order.countCart({ id: order.id });
  },

  async setCount(criteria: CriteriaQuery<Order>, dish: OrderDish, amount: number): Promise<void> {
    await emitter.emit.apply(emitter, ["core-order-before-set-count", ...arguments]);
    const _dish = dish.dish as Dish;
    if (_dish.balance !== -1)
      if (amount > _dish.balance) {
        await emitter.emit.apply(emitter, ["core-order-set-count-reject-amount", ...arguments]);
        throw {
          body: `There is no so mush dishes with id ${dish.id}`,
          code: 1,
        };
      }

    const order = await Order.findOne(criteria).populate("dishes");
    if (order.state === "ORDER") throw "order with orderId " + order.id + "in state ORDER";

    const orderDishes = await OrderDish.find({ order: order.id }).populate("dish");
    const get = orderDishes.find((item) => item.id === dish.id);

    if (get) {
      get.amount = amount;
      if (get.amount > 0) {
        await OrderDish.update({ id: get.id }, { amount: get.amount }).fetch();
      } else {
        await OrderDish.destroy({ id: get.id });
        sails.log.info("destroy", get.id);
      }

      await Order.next(order.id, "CART");
      await Order.countCart({ id: order.id });
      Order.update({ id: order.id }, order).fetch();
      await emitter.emit.apply(emitter, ["core-order-after-set-count", ...arguments]);
    } else {
      await emitter.emit.apply(emitter, ["core-order-set-count-reject-no-orderdish", ...arguments]);
      throw { body: `OrderDish dish id ${dish.id} not found`, code: 2 };
    }
  },

  async setComment(criteria: CriteriaQuery<Order>, dish: OrderDish, comment: string): Promise<void> {
    await emitter.emit.apply(emitter, ["core-order-before-set-comment", ...arguments]);

    const order = await Order.findOne(criteria).populate("dishes");
    if (order.state === "ORDER") throw "order with orderId " + order.id + "in state ORDER";

    const orderDish = await OrderDish.findOne({
      order: order.id,
      id: dish.id,
    }).populate("dish");

    if (orderDish) {
      await OrderDish.update({ id: orderDish.id }, { comment: comment }).fetch();

      await Order.next(order.id, "CART");
      await Order.countCart({ id: order.id });
      Order.update({ id: order.id }, order).fetch();
      await emitter.emit.apply(emitter, ["core-order-after-set-comment", ...arguments]);
    } else {
      await emitter.emit.apply(emitter, ["core-order-set-comment-reject-no-orderdish", ...arguments]);
      throw { body: `OrderDish with id ${dish.id} not found`, code: 1 };
    }
  },

  /**
   * Clone dishes in new order
   * @param source Order findOne criteria
   * @returns new order
   */
  async clone(source: CriteriaQuery<Order>): Promise<Order> {

    // Find the original order by ID
    const originalOrder = await Order.findOne(source).populate("dishes");

    // Check if the original order exists
    if (!originalOrder) {
      throw new Error(`Order with ID ${originalOrder.id} not found.`);
    }

    const newOrder = await Order.create({}).fetch();

    // Clone the order dishes from the original order to the new order
    const originalOrderDishes = originalOrder.dishes as OrderDish[];

    // Iterate through the original order dishes and add them to the new order
    for (const originalOrderDish of originalOrderDishes) {
      if(originalOrderDish.addedBy !== "user") continue;
      // Assuming you have an addDish method that takes an order ID and a dish object as parameters
      await Order.addDish({ id: newOrder.id }, originalOrderDish.dish, originalOrderDish.amount, originalOrderDish.modifiers, null, "user");
    }

    return newOrder;
  },
  /**
   * Set order selfService field. Use this method to change selfService.
   * @param selfService
   */
  async setSelfService(criteria: CriteriaQuery<Order>, selfService: boolean = true): Promise<Order> {

    sails.log.silly("Order > setSelfService >", selfService);
    const order = await Order.findOne(criteria);
    if (order.state === "ORDER") throw "order with orderId " + order.id + "in state ORDER";

    return (await Order.update(criteria, { selfService: Boolean(selfService) }).fetch())[0];
  },

  /**
   * !! Not for external use, only in Order.check
   * The use of bonuses in the cart implies that this order has a user. 
   * Then all checks will be made and a record will be written in the transaction of user bonuses
   * 
   Bonus spending strategies :
    1) 'bonus_from_order_total': (default) deduction from the final amount of the order including promotional dishes, discounts and delivery
    2) 'bonus_from_basket_delivery_discount': writing off bonuses from the amount of the basket, delivery and discounts (not including promotional dishes)
    3) 'bonus_from_basket_and_delivery': writing off bonuses from the amount of the basket and delivery (not including promotional dishes, discounts)
    4) 'bonus_from_basket': write-off of bonuses from the amount of the basket (not including promotional dishes, discounts and delivery)

    Current implement logic for only one strategy

   */

  async checkBonus(orderId, spendBonus: SpendBonus): Promise<void> {
    const order = await Order.findOne({ id: orderId });

    if (order.user && typeof order.user === "string") {
      // Fetch the bonus program for this bonus spend
      const bonusProgram = await BonusProgram.findOne({ id: spendBonus.bonusProgramId });
      const bonusSpendingStrategy = await Settings.get("BONUS_SPENDING_STRATEGY") ?? "bonus_from_order_total";
      let amountToDeduct = 0;
      switch (bonusSpendingStrategy) {
        case 'bonus_from_order_total':
          amountToDeduct = order.total;
          break;
        case 'bonus_from_basket_delivery_discount':
          amountToDeduct = order.basketTotal + order.deliveryCost - order.discountTotal;
          break;
        case 'bonus_from_basket_and_delivery':
          amountToDeduct = order.basketTotal + order.deliveryCost;
          break;
        case 'bonus_from_basket':
          amountToDeduct = order.basketTotal;
          break;
        default:
          throw `Invalid bonus spending strategy: ${bonusSpendingStrategy}`;
      }

      // Calculate maximum allowed bonus coverage
      const maxBonusCoverage = new Decimal(amountToDeduct).mul(bonusProgram.coveragePercentage);

      // Check if the specified bonus spend amount is more than the maximum allowed bonus coverage
      let bonusCoverage: Decimal;
      if (spendBonus.amount && new Decimal(spendBonus.amount).lessThan(maxBonusCoverage)) {
        bonusCoverage = new Decimal(spendBonus.amount);
      } else {
        bonusCoverage = maxBonusCoverage;
      }

      // Deduct the bonus from the order total
      order.total = new Decimal(order.total).sub(bonusCoverage).toNumber();


      // Throw if User not have bonuses to cover this 
      await UserBonusTransaction.create({
        amount: bonusCoverage.toNumber(),
        bonusProgram: bonusProgram.id,
        user: order.user
      }).fetch();

      // Update the order with new total
      await Order.updateOne({ id: orderId }, { total: order.total, bonusesTotal: bonusCoverage.toNumber() });

    } else {
      throw `User not found in Order, applyBonuses failed`
    }
  },

  // TODO: implement clearOfPromotion
  async clearOfPromotion() {
    // remove from collection
  },


  ////////////////////////////////////////////////////////////////////////////////////

  // TODO: rewrite for OrderId instead criteria FOR ALL MODELS because is not batch check
  async check(
    criteria: CriteriaQuery<Order>,
    customer?: Customer,
    isSelfService?: boolean,
    address?: Address,
    paymentMethodId?: string,
    spendBonus?: SpendBonus
  ): Promise<void> {


    let order: Order = await Order.findOne(criteria);

    // CHECKING
    // Check order empty
    if (order.dishesCount === 0) {
      throw {
        code: 13,
        error: "order is empty",
      };
    }

    if (await Maintenance.getActiveMaintenance() !== undefined) throw `Currently site is off`
    if (order.state === "ORDER") throw `order with orderId ${order.id}in state ORDER`;
    if (order.promotionUnorderable === true) throw `Order not possible for order by promotion`;


    //const order: Order = await Order.findOne(criteria);
    if (order.paid) {
      sails.log.error("CART > Check > error", order.id, "order is paid");
      throw {
        code: 12,
        error: "order is paid",
      };
    }

    /**
     *  // TODO:  Perhaps you need to add a lifetime for a check for a check (make a globally the concept of an audit of the Intelligence system if it is less than a check version, then you need to go through the check again)
     */

    emitter.emit("core-order-before-check", order, customer, isSelfService, address);

    sails.log.silly(`Order > check > before check > ${JSON.stringify(customer)} ${isSelfService} ${JSON.stringify(address)} ${paymentMethodId}`);

    // Start checking
    await Order.next(order.id, "CART");
    if (customer) {
      await checkCustomerInfo(customer);
      order.customer = { ...customer };
    } else {
      if (order.customer === null) {
        throw {
          code: 2,
          error: "customer is required",
        };
      }
    }

    await checkDate(order);

    if (paymentMethodId) {
      await checkPaymentMethod(paymentMethodId);
      order.paymentMethod = paymentMethodId;
      order.paymentMethodTitle = (await PaymentMethod.findOne({ id: paymentMethodId })).title;
      order.isPaymentPromise = await PaymentMethod.isPaymentPromise(paymentMethodId);
    }

    /** if pickup, then you do not need to check the address*/
    if (isSelfService) {
      order.selfService = true;
      emitter.emit("core-order-is-self-service", order, customer, isSelfService, address);
    } else {
      order.selfService = false;
      if (address) {
        if (!address.city) address.city = await Settings.get("city") as string
        checkAddress(address);
        order.address = { ...address };
      } else {
        if (!isSelfService && order.address === null) {
          throw {
            code: 5,
            error: "address is required",
          };
        }
      }
    }


    // Custom emmitters checks
    const results = await emitter.emit("core-order-check", order, customer, isSelfService, address, paymentMethodId);

    delete (order.dishes);
    await Order.update({ id: order.id }, { ...order });

    ////////////////////
    // CHECKOUT COUNTING

    try {
      order = await Order.countCart({ id: order.id });
    } catch (error) {
      sails.log.error("Check countcart error:", error);
      throw {
        code: 14,
        error: "Problem with counting cart",
      };
    }

    if (!order.selfService && !order.delivery.allowed) {
      throw {
        code: 11,
        error: "Delivery not allowed",
      };
    }

    /**
     *  Bonus spending
     * */
    if (order.user && typeof order.user === "string" && spendBonus && spendBonus.bonusProgramId) {

      // load bonus strategy
      let bonusSpendingStrategy = await Settings.get("BONUS_SPENDING_STRATEGY") ?? 'bonus_from_order_total';
      // Fetch the bonus program for this bonus spend
      const bonusProgram = await BonusProgram.findOne({ id: spendBonus.bonusProgramId });
      spendBonus.amount = parseFloat(new Decimal(spendBonus.amount).toFixed(bonusProgram.decimals))


      // TODO: rewrite for Decimal.js
      let amountToDeduct = 0;
      switch (bonusSpendingStrategy) {
        case 'bonus_from_order_total':
          amountToDeduct = order.total;
          break;
        case 'bonus_from_basket_delivery_discount':
          amountToDeduct = order.basketTotal + order.deliveryCost - order.discountTotal;
          break;
        case 'bonus_from_basket_and_delivery':
          amountToDeduct = order.basketTotal + order.deliveryCost;
          break;
        case 'bonus_from_basket':
          amountToDeduct = order.basketTotal;
          break;
        default:
          throw `Invalid bonus spending strategy: ${bonusSpendingStrategy}`;
      }

      // Calculate maximum allowed bonus coverage
      const maxBonusCoverage = new Decimal(amountToDeduct).mul(bonusProgram.coveragePercentage);

      // Check if the specified bonus spend amount is more than the maximum allowed bonus coverage
      let bonusCoverage: Decimal;
      if (spendBonus.amount && new Decimal(spendBonus.amount).lessThan(maxBonusCoverage)) {
        bonusCoverage = new Decimal(spendBonus.amount);
      } else {
        bonusCoverage = maxBonusCoverage;
      }

      // Deduct the bonus from the order total
      order.spendBonus = spendBonus;
      order.total = new Decimal(order.total).sub(bonusCoverage).toNumber();
      order.bonusesTotal = bonusCoverage.toNumber();
    }



    sails.log.silly("Order > check > after wait general emitter", order, results);
    emitter.emit("core-order-after-check-counting", order);

    delete (order.dishes);
    await Order.update({ id: order.id }, { ...order });


    /** The check can pass without listeners, because the check itself is minimal
    * has basic checks. And is self-sufficient, but
    * is still set by default so all checks must be passed
    */
    const checkConfig = (await Settings.use("CHECKOUT_STRATEGY")) as any;

    /**
     * If checkout policy not required then push next
     */
    if (checkConfig && checkConfig.notRequired) {
      if ((await Order.getState(order.id)) !== "CHECKOUT") {
        await Order.next(order.id, "CHECKOUT");
      }
      return;
    }

    /** Success in all listeners by default */
    const resultsCount = results.length;
    const successCount = results.filter((r) => r.state === "success").length;

    if (resultsCount === successCount) {
      if ((await Order.getState(order.id)) !== "CHECKOUT") {
        await Order.next(order.id, "CHECKOUT");
      }
      return;
    } else {
      let error: string
      // Find error reason
      results.forEach(result => {
        if (result.state === 'error' && result.error) {
          sails.log.error(`Order > core-order-check error: ${result.error}`);
          sails.log.error(result);
          error = result.error
        }
      });

      throw {
        code: 0,
        error: `one or more results from core-order-check was not sucessed\n last error: ${error}`,
      };
    }

    /**
     * Here, there should be the logic of the success of at least one listener, but
     * At the moment, no practical application was found.
     *
     * if (checkconfig.justone) ...
     */
  },

  ////////////////////////////////////////////////////////////////////////////////////

  /** Basket design*/
  async order(criteria: CriteriaQuery<Order>): Promise<void> {
    const order = await Order.findOne(criteria);
    // Check maintenance
    if (await Maintenance.getActiveMaintenance() !== undefined) throw `Currently site is off`

    //  TODO: impl with stateflow
    if (order.state === "ORDER") throw "order with orderId " + order.id + "in state ORDER";
    if (order.state === "CART") throw "order with orderId " + order.id + "in state CART";

    // await Order.update({id: order.id}).fetch();
    // TODO: this check is needed
    // if(( order.isPaymentPromise && order.paid) || ( !order.isPaymentPromise && !order.paid) )
    //   return 3

    emitter.emit("core-order-before-order", order);
    sails.log.silly("Order > order > before order >", order.customer, order.selfService, order.address);

    if (order.selfService) {
      emitter.emit("core-order-order-self-service", order);
    } else {
      emitter.emit("core-order-order-delivery", order);
    }

    /**
     *  I think that this function is unnecessary here, although the entire emitter was created for it.
     *  Obviously, having an RMS adapter at your disposal, you don’t need a waiting listener at all
     *  But since it exists, it will be revised in version 2
     * @deprecated Event `core-order-order`
     */
    const results = await emitter.emit("core-order-order", order);

    sails.log.silly("Order > order > after wait general emitter results: ", results);
    const resultsCount = results.length;
    const successCount = results.filter((r) => r.state === "success").length;

    const orderConfig = await Settings.use("order") as unknown as { requireAll: boolean, justOne: boolean };
    if (orderConfig) {
      if (orderConfig.requireAll) {
        if (resultsCount === successCount) {
          await orderIt();
          return;
        } else {
          throw "At least one listener did not complete the order.";
        }
      }
      if (orderConfig.justOne) {
        if (successCount > 0) {
          await orderIt();
          return;
        } else {
          throw "No listener completed the order";
        }
      }

      throw "Bad orderConfig";
    }

    await orderIt();
    return;

    async function orderIt() {

      if (order.user && order.bonusesTotal) {
        // Throw if User not have bonuses to cover this 
        await UserBonusTransaction.create({
          isNegative: true,
          amount: order.bonusesTotal,
          bonusProgram: order.spendBonus.bonusProgramId,
          user: order.user
        }).fetch();
      }

      // await Order.next(order.id,'ORDER');
      // TODO: Rewrite on stateflow
      let data: any = {};
      data.orderDate = new Date();
      data.state = "ORDER";

      /** ⚠️ If the preservation of the model is caused to NEXT, then there will be an endless cycle */
      sails.log.silly("Order > order > before save order", order);
      // await Order.update({id: order.id}).fetch();
      await Order.update({ id: order.id }, data).fetch();

      /** Here core just make emit, 
       * instead call directly in RMSadapter. 
       * But i think we need select default adpater, 
       * and make order here */

      try {
        let orderWithRMS = await (await Adapter.getRMSAdapter()).createOrder(order);
        await Order.update({ id: order.id }, {
          rmsId: orderWithRMS.rmsId,
          rmsOrderNumber: orderWithRMS.rmsOrderNumber,
          rmsOrderData: orderWithRMS.rmsOrderData
        })
        sails.log.info(`RestoCore > new order with id [${orderWithRMS.shortId}] for [${orderWithRMS.customer.phone.code + orderWithRMS.customer.phone.number}] total: ${orderWithRMS.total} has rmsOrderNumber: ${orderWithRMS.rmsOrderNumber}`)
      } catch (error) {
        const orderError = {
          rmsErrorCode: error.code ?? "Error",
          rmsErrorMessage: error.message ?? JSON.stringify(error)
        }
        sails.log.error(`RestoCore > orderIt error:`, error)
        await Order.update({ id: order.id }, orderError)
      }

      emitter.emit("core-order-after-order", order);
      if (order.user) {
        UserOrderHistory.save(order.id);
      }
    }
  },

  async payment(criteria: CriteriaQuery<Order>): Promise<PaymentResponse> {
    const order: Order = await Order.findOne(criteria);
    if (order.state !== "CHECKOUT") throw "order with orderId " + order.id + "in state ${order.state} but need CHECKOUT";

    var paymentResponse: PaymentResponse;
    let comment: string = "";
    var backLinkSuccess: string = (await Settings.use("FRONTEND_ORDER_PAGE")) + order.shortId;
    var backLinkFail: string = await Settings.use("FRONTEND_CHECKOUT_PAGE") as string;
    let paymentMethodId = await order.paymentMethod
    sails.log.silly("Order > payment > before payment register", order);

    var params = {
      backLinkSuccess: backLinkSuccess,
      backLinkFail: backLinkFail,
      comment: comment,
    };
    await Order.countCart({ id: order.id });
    await emitter.emit("core-order-payment", order, params);
    sails.log.silly("Order > payment > order before register:", order);
    try {
      paymentResponse = await PaymentDocument.register(
        order.id,
        "order",
        order.total,
        paymentMethodId,
        params.backLinkSuccess,
        params.backLinkFail,
        params.comment, order);
    } catch (e) {
      emitter.emit("error", "order>payment", e);
      sails.log.error("Order > payment: ", e);
    }
    await Order.next(order.id, "PAYMENT");
    return paymentResponse;
  },

  async paymentMethodId(criteria: CriteriaQuery<Order>): Promise<string> {
    let populatedOrder = (await Order.find(criteria).populate("paymentMethod"))[0];
    let paymentMethod = populatedOrder.paymentMethod as PaymentMethod;
    return paymentMethod.id;
  },

  /**  given populated Order instance  by criteria*/
  async populate(criteria: CriteriaQuery<Order>) {
    let order = await Order.findOne(criteria)
      .populate('paymentMethod')
      .populate('deliveryItem')
      .populate('user')
      ;

    if (!order) throw `order by criteria: ${criteria},  not found`;

    let fullOrder: Order;
    try {
      fullOrder = await Order.findOne({ id: order.id })
        .populate("dishes")
        .populate("deliveryItem")
        .populate('paymentMethod');
      const orderDishes = await OrderDish.find({ order: order.id }).populate("dish").sort("createdAt");

      for (let orderDish of orderDishes) {
        if (!orderDish.dish) {
          sails.log.error("orderDish", orderDish.id, "has not dish");
          continue;
        }

        // WHATIS? It seems like test of waterline or check orderDishes not in Order?!
        // if (!fullOrder.dishes.filter((d: { id: number; }) => d.id === orderDish.id).length) {
        //   sails.log.error("orderDish", orderDish.id, "not exists in order", order.id);
        //   continue;
        // }
        const _dish = orderDish.dish as Dish;
        const dish = await Dish.findOne({
          id: _dish.id,
          // проблема в том что корзина после заказа должна всеравно показывать блюда даже удаленные, для этого надо запекать данные.ы
          // isDeleted: false,
        })
          .populate("images")
          .populate("parentGroup");

        await Dish.getDishModifiers(dish);
        orderDish.dish = dish;

        if (orderDish.modifiers !== undefined && Array.isArray(orderDish.modifiers)) {
          for await (let modifier of orderDish.modifiers) {
            modifier.dish = (await Dish.find({ id: modifier.id }).limit(1))[0];
          }
        } else {
          throw `orderDish.modifiers not iterable orderDish: ${JSON.stringify(orderDish.modifiers, undefined, 2)}`
        }
      }
      fullOrder.dishes = orderDishes;

      // TODO: refactor descr in method was writed
      // fullOrder.orderDateLimit = "await getOrderDateLimit()";
      // fullOrder.orderId = fullOrder.id;
    } catch (e) {
      sails.log.error("CART > fullOrder error", e);
    }

    return { ...fullOrder };
  },

  /**
   * Method for calculating the basket. This is called every time the cart changes.
   * @param criteria OrderId
   * @param isPromoting If you use countCart inside a promo, then you should indicate this is `true`. Also you should set the isPromoting state in the model
   * @returns Order
   */
  async countCart(criteria: CriteriaQuery<Order>, isPromoting: boolean = false): Promise<Order> {
    try {

      let order = await Order.findOne(criteria);
      if (order.isPromoting !== isPromoting) {
        let err = `CountCart: The order status does not match the passed parameters order.isPromoting [${order.isPromoting}], attribute [${isPromoting}], check your promotions`
        sails.log.error(err);
        throw new Error(err)
      }
      order.isPromoting = isPromoting;

      emitter.emit("core-order-before-count", order);
      
      /**
       *  // TODO: If countCart from payment or other changes from payment it should cancel all payment request
       */
      if (!["CART", "CHECKOUT", "PAYMENT"].includes(order.state)) throw `Order with orderId ${order.id} - not can calculated from current state: (${order.state})`;

      const orderDishes = await OrderDish.find({ order: order.id }).populate("dish");
      // const orderDishesClone = {}
      let basketTotal = new Decimal(0);
      let dishesCount = 0;
      // let uniqueDishes = orderDishes.length;
      let uniqueDishes = 0
      let totalWeight = new Decimal(0);

      // TODO: clear the order
      const orderDishesForPopulate = [] as OrderDish[]

      for await (let orderDish of orderDishes) {

        try {
          if (orderDish.dish && typeof orderDish.dish !== "string") {

            // Item OrderDish calcualte
            let itemCost = orderDish.dish.price;
            let itemWeight = orderDish.dish.weight ?? 0;


            const dish = (await Dish.find({ id: orderDish.dish.id }).limit(1))[0];

            // Checks that the dish is available for sale
            if (!dish) {
              sails.log.error("Dish with id " + orderDish.dish.id + " not found!");
              emitter.emit("core-order-return-full-order-destroy-orderdish", dish, order);
              await OrderDish.destroy({ id: orderDish.id });
              continue;
            }

            if (dish.balance === -1 ? false : dish.balance < orderDish.amount) {
              orderDish.amount = dish.balance;
              //It is necessary to delete if the amount is 0
              if (orderDish.amount >= 0) {
                await Order.removeDish({ id: order.id }, orderDish, 999999);
              }
              emitter.emit("core-orderdish-change-amount", orderDish);
              sails.log.debug(`Order with id ${order.id} and  CardDish with id ${orderDish.id} amount was changed!`);
            }


            orderDish.uniqueItems += orderDish.amount; // deprecated



            orderDish.itemTotal = 0;
            orderDish.weight = 0;
            orderDish.totalWeight = 0;

            // orderDish.dishId = dish.id

            if (orderDish.modifiers && Array.isArray(orderDish.modifiers)) {
              for await (let modifier of orderDish.modifiers) {
                const modifierObj = (await Dish.find({ where: { or: [{ id: modifier.id }, { rmsId: modifier.id }] } }).limit(1))[0];

                if (!modifierObj) {
                  throw "Dish with id " + modifier.id + " not found!";
                }

                // let opts:  any = {} 
                // await emitter.emit("core-order-countcart-before-calc-modifier", modifier, modifierObj, opts);

                // const modifierCopy = {
                //   amount: modifier.amount,
                //   id: modifier.id
                // }
                // await emitter.emit('core-order-countcart-before-calc-modifier', modifierCopy, modifierObj);

                /** // TODO:
                 * Initial modification checking logic, now it's ugly.
                 * Needed review architecture modifiers to keep it in model.
                 * Also all checks modifiers need process in current loop thread. Currently we not have access to modifer options
                 * Here by opts we can pass options for modifiers
                 */

                const dishModifiers = dish.modifiers
                let currentModifier: Modifier = null;
                dishModifiers.forEach(group => {
                  if (group.childModifiers) {
                    group.childModifiers.forEach(_modifier => {
                      if (modifier.id === _modifier.id) {
                        currentModifier = _modifier;
                      }
                    })
                  }
                })
                if (!currentModifier) {
                  sails.log.error(`Order with id [${order.id}] has unknown modifier [${modifier.id}]`)
                }
                if (currentModifier.freeOfChargeAmount && typeof currentModifier.freeOfChargeAmount === "number" && currentModifier.freeOfChargeAmount > 0) {
                  const freeAmountCost = new Decimal(currentModifier.freeOfChargeAmount).times(modifierObj.price).toNumber();
                  const modifierCost = new Decimal(modifier.amount).times(modifierObj.price).minus(freeAmountCost).toNumber();
                  itemCost = new Decimal(itemCost).plus(modifierCost).toNumber();
                } else {
                  const modifierCost = new Decimal(modifier.amount).times(modifierObj.price).toNumber();
                  itemCost = new Decimal(itemCost).plus(modifierCost).toNumber();
                }

                // TODO: discountPrice && freeAmount
                // // FreeAmount modiefires support
                // if (opts.freeAmount && typeof opts.freeAmount === "number") {
                //   if (opts.freeAmount < modifier.amount) {
                //     let freePrice = new Decimal(modifierObj.price).times(opts.freeAmount)
                //     orderDish.itemTotal = new Decimal(orderDish.itemTotal).minus(freePrice).toNumber();
                //   } else {
                //     // If more just calc
                //     let freePrice = new Decimal(modifierObj.price).times(modifier.amount)
                //     orderDish.itemTotal = new Decimal(orderDish.itemTotal).minus(freePrice).toNumber();
                //   }
                // }                

                if (!Number(itemCost)) throw `itemCost is NaN ${JSON.stringify(modifier)}.`
                itemWeight = new Decimal(itemWeight).plus(modifierObj.weight ?? 0).toNumber();
              }
            }

            orderDish.totalWeight = new Decimal(itemWeight).times(orderDish.amount).toNumber();
            // itemCost => orderDish.itemTotal
            orderDish.itemTotal = new Decimal(itemCost).times(orderDish.amount).toNumber();

            orderDish.dish = orderDish.dish.id;

            await OrderDish.update({ id: orderDish.id }, orderDish).fetch();
            orderDish.dish = dish;
            orderDishesForPopulate.push({ ...orderDish })
          }

          // TODO: test it
          if (orderDish.addedBy === "user") {
            basketTotal = basketTotal.plus(orderDish.itemTotal);
          }

          dishesCount += orderDish.amount;
          uniqueDishes++;
          totalWeight = totalWeight.plus(orderDish.totalWeight);
        } catch (e) {
          sails.log.error("Order > count > iterate orderDish error", e);
          await OrderDish.destroy({ id: orderDish.id });
          uniqueDishes -= 1;
          continue;
        }
      }

      order.dishesCount = dishesCount;
      order.uniqueDishes = uniqueDishes;
      order.totalWeight = totalWeight.toNumber();

      order.orderTotal = basketTotal.toNumber();
      order.basketTotal = basketTotal.toNumber();

      /**
      * Calcualte promotion & Discount costs
      * Here calculates all discounts for order
       */

      // Promotion code
      if (!order.isPromoting) {
        emitter.emit("core:count-before-promotion", order);
        try {
          let promotionAdapter: AbstractPromotionAdapter = Adapter.getPromotionAdapter();
          // set lock
          order.isPromoting = true;
          await Order.updateOne({ id: order.id }, { isPromoting: true });

          // If promocode is valid and allowed
          if (order.promotionCode !== null && order.promotionCodeCheckValidTill !== null) {
            const currentDate = new Date(); 
            try {
              const promotionEndDate = new Date(order.promotionCodeCheckValidTill);
              if (promotionEndDate > currentDate) {
                order.promotionCode = await PromotionCode.findOne({ id: order.promotionCode as string }).populate('promotion');
              } else {
                sails.log.debug(`Count: promocode [${order.promotionCodeString}] expired, order [${order.id}].`)
                order.promotionCode = null
                order.promotionCodeDescription = "Promocode expired"
                order.promotionCodeCheckValidTill = null
              }
            } catch (error) {
              sails.log.error(`PromotionAdapter > Problem with parse Date`)
            }
          } else {
            order.promotionCode = null
            order.promotionCodeCheckValidTill = null
          }


          let orderPopulate: Order = { ...order }
          orderPopulate.dishes = orderDishesForPopulate

          /**
           * All promotions hadlers are calculated here, the main idea is that the order is modified during execution.
           * The developer who creates promotions must take care about order in database and order runtime object.
           */
          let orederPROM = await promotionAdapter.processOrder(orderPopulate);
          
          delete (orderPopulate.dishes);
          delete(order.promotionCode);

          if (orderPopulate.promotionCode) {
            orderPopulate.promotionCode = (orderPopulate.promotionCode as PromotionCode).id
            order.promotionCode = orderPopulate.promotionCode
          }

          orderPopulate.discountTotal = orederPROM.discountTotal

          order = orderPopulate;

          let promotionOrderToSave = {
            promotionCodeDescription: order.promotionCodeDescription,
            promotionState: order.promotionState,
            promotionUnorderable: order.promotionUnorderable,
            discountTotal: order.discountTotal,
            promotionFlatDiscount: order.promotionFlatDiscount,
            promotionDelivery: order.promotionDelivery,
          }
        
          await Order.update({ id: order.id }, promotionOrderToSave).fetch();
        } catch (error) {
          sails.log.error(`Core > order > promotion calculate fail: `, error)
        } finally {
          // finaly
          order.isPromoting = false;
          await Order.update({ id: order.id }, { isPromoting: false }).fetch();
        }

        
        emitter.emit("core-order-after-promotion", order);
      }

      // Force unpopulate promotionCode, TODO: debug it why is not unpopulated here?!
      if(typeof order.promotionCode !== "string" && order.promotionCode?.id !== undefined){
        order.promotionCode = order.promotionCode.id
      }

      // Calcualte delivery costs
      emitter.emit("core:count-before-delivery-cost", order);
      if (order.promotionDelivery && isValidDelivery(order.promotionDelivery)) {
        order.delivery = order.promotionDelivery;
      } else {
        let deliveryAdapter = await Adapter.getDeliveryAdapter();
        await deliveryAdapter.reset(order);
        if (order.selfService === false && order.address?.city && order.address?.street && order.address?.home) {
          emitter.emit("core-order-check-delivery", order);
          try {
            let delivery: Delivery
            try {
              delivery = await deliveryAdapter.calculate(order);
            } catch (error) {
              sails.log.error("deliveryAdapter.calculate error:", error)
              delivery = {
                allowed: false,
                cost: 0,
                item: undefined,
                message: error,
                deliveryTimeMinutes: Infinity
              }
            }
            order.delivery = delivery
          } catch (error) {
            sails.log.error(`Core > order > delivery calculate fail: `, error)
          }
          emitter.emit("core-order-after-check-delivery", order);
        }
      }

      if (order.delivery && isValidDelivery(order.delivery)) {
        if (!order.delivery.item) {
          order.deliveryCost = order.delivery.cost
        } else {
          const deliveryItem = await Dish.findOne({ where: { or: [{ id: order.delivery.item }, { rmsId: order.delivery.item }] } });
          if (deliveryItem) {
            order.deliveryItem = deliveryItem.id
            order.deliveryCost = deliveryItem.price
          } else {
            order.deliveryCost = 0;
            order.deliveryItem = null;
            order.deliveryDescription = '';
          }
        }
        order.deliveryDescription = typeof order.delivery.message === "string" ? order.delivery.message : JSON.stringify(order.delivery.message);
      } else {
        order.deliveryCost = 0;
        order.deliveryItem = null;
        order.deliveryDescription = '';
      }

      emitter.emit("core:count-after-delivery-cost", order);
      // END calculate delivery cost

      order.total = new Decimal(basketTotal).plus(order.deliveryCost).minus(order.discountTotal).toNumber();

      order = (await Order.update({ id: order.id }, order).fetch())[0];


      emitter.emit("core-order-after-count", order);
      return order;
    } catch (error) {
      console.error(" error >", error);
    }
  },


  async doPaid(criteria: CriteriaQuery<Order>, paymentDocument: PaymentDocument): Promise<void> {
    let order = await Order.findOne(criteria);

    if (order.paid) {
      sails.log.debug(`Order > doPaid: Order with id ${order.id} is paid`);
      return
    }

    try {
      let paymentMethodTitle = (await PaymentMethod.findOne(paymentDocument.paymentMethod)).title;
      await Order.update(
        { id: paymentDocument.originModelId },
        {
          paid: true,
          paymentMethod: paymentDocument.paymentMethod,
          paymentMethodTitle: paymentMethodTitle,
        }
      ).fetch();

      sails.log.debug("Order > doPaid: ", order.id, order.state, order.total, paymentDocument.amount);


      if (order.state !== "PAYMENT") {
        sails.log.error("Order > doPaid: is strange order state is not PAYMENT", order);
      }

      if (order.total !== paymentDocument.amount) {
        order.problem = true;
        order.comment = order.comment + "Attention, the composition of the order was changed, the bank account received:" + paymentDocument.amount;
      }

      await Order.order({ id: order.id });
      emitter.emit("core-order-after-dopaid", order);

    } catch (e) {
      sails.log.error("Order > doPaid error: ", e);
      throw e;
    }
  },

  async applyPromotionCode(criteria: CriteriaQuery<Order>, promotionCodeString: string | null): Promise<Order> {
    let order = await Order.findOne(criteria);
    let updateData: any = {};

    if (!promotionCodeString || promotionCodeString === null) {
      updateData = {
        promotionCode: null,
        promotionCodeCheckValidTill: null,
        promotionCodeString: null,
        promotionCodeDescription: null
      };
    } else {
      const validPromotionCode = await PromotionCode.getValidPromotionCode(promotionCodeString);
      const isValidTill = "2099-01-01T00:00:00.000Z" // TODO: recursive check Codes and Promotions

      if (validPromotionCode) {
        let description = validPromotionCode.description;

        if (!validPromotionCode.promotion) {
          sails.log.error(`No valid promotions for ${promotionCodeString}`);
          description += " [Error]";
        }

        updateData = {
          promotionCode: validPromotionCode.id,
          promotionCodeCheckValidTill: isValidTill,
          promotionCodeString: promotionCodeString,
          promotionCodeDescription: description
        };
      } else {
        updateData = {
          promotionCode: null,
          promotionCodeCheckValidTill: null,
          promotionCodeString: promotionCodeString,
          promotionCodeDescription: `Promocode expired or not valid`
        };
        sails.log.debug(`No valid promocodes for ${promotionCodeString} order: [${order.id}]`);
      }
    }

    await Order.update({ id: order.id }, updateData).fetch();
    return await Order.countCart(criteria);
  }

};

// Waterline model export
module.exports = {
  primaryKey: "id",
  attributes: attributes,
  ...Model,
};

declare global {
  // Typescript export
  const Order: typeof Model & ORMModel<Order, null> & StateFlowModel;
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

  if (!customer.phone.code || !customer.phone.number) {
    throw {
      code: 2,
      error: "customer.phone is required",
    };
  }



  let allowedPhoneCountries = await Settings.get("ALLOWED_PHONE_COUNTRIES") as string | string[];
  if (typeof allowedPhoneCountries === "string") allowedPhoneCountries = [allowedPhoneCountries];
  let isValidPhone = allowedPhoneCountries === undefined;

  if(Array.isArray(allowedPhoneCountries)) {
    for (let countryCode of allowedPhoneCountries) {
      const country = sails.hooks.restocore["dictionaries"].countries[countryCode];
      isValidPhone = phoneValidByMask(customer.phone.code + customer.phone.number, country.phoneCode, country.phoneMask)
      if (isValidPhone) break;
    }
  }

  const nameRegex = await Settings.use("nameRegex") as string;
  if (nameRegex) {
    if (!nameRegex.match(customer.name)) {
      throw {
        code: 3,
        error: "customer.name is invalid",
      };
    }
  }
  if (!isValidPhone) {
    throw {
      code: 4,
      error: "customer.phone is invalid",
    };
  }
}

function checkAddress(address) {
  if (!address.street && !address.streetId) {
    throw {
      code: 5,
      error: "address.street or streetId  is required",
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

async function checkDate(order: Order) {
  if (order.date) {
    const date = new Date(order.date);

    function isDateInPast(date: string, timeZone: string) {
      let currentDate = new Date();
      let currentTimestamp = currentDate.getTime();
      let targetDate = new Date(date);

      //  is eqials timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      let targetTimestamp
      try {
        targetTimestamp = new Date(targetDate.toLocaleString('en', { timeZone: timeZone })).getTime();
      } catch (error) {
        sails.log.error(`TimeZone not defined. TZ: [${timeZone}]`)
        targetTimestamp = new Date(targetDate.toLocaleString('en')).getTime();
      }

      return targetTimestamp < currentTimestamp;
    }

    const timezone = await Settings.get('TZ') as string ?? 'Etc/GMT';

    if (isDateInPast(order.date, timezone)) {
      throw {
        code: 15,
        error: "date is past",
      };
    }

    // date is Date
    if (date instanceof Date === true && !date.toJSON()) {
      throw {
        code: 9,
        error: "date is not valid",
      };
    }

    // Limit order date
    const possibleDatetime = await getOrderDateLimit();
    if (date.getTime() > possibleDatetime.getTime()) {
      sails.log.error(`Order checkDate: ${date.getTime()} > ${possibleDatetime.getTime()} = ${date.getTime() > possibleDatetime.getTime()}`)
      throw {
        code: 10,
        error: "delivery far, far away! allowed not after" + possibleDatetime,
      };
    }

    // Maintenance date check
    let maintenance = await Maintenance.getActiveMaintenance(order.date);
    if (maintenance) {
      throw {
        code: 16,
        error: "date not allowed",
      };
    }
  }
}

/**
 * Return Date in future
 * default 1 day
 */

// TODO: refactor possibleToOrderInMinutes from seconds to full work days
async function getOrderDateLimit(): Promise<Date> {
  let date = new Date();
  let possibleToOrderInMinutes: string = await Settings.get("POSSIBLE_TO_ORDER_IN_MINUTES") as string; //minutes
  if (!possibleToOrderInMinutes) possibleToOrderInMinutes = "1440";

  date.setSeconds(date.getSeconds() + (parseInt(possibleToOrderInMinutes) * 60));
  return date;
}

function isValidDelivery(delivery: Delivery): boolean {
  // Check if the required properties exist and have the correct types
  // {"deliveryTimeMinutes":180,"allowed":true,"message":"","item":"de78c552-71e6-5296-ae07-a5114d4e88bc"}
  if (
    typeof delivery.deliveryTimeMinutes === 'number' &&
    typeof delivery.allowed === 'boolean' &&
    typeof delivery.message === 'string'
  ) {

    if (!delivery.cost && !delivery.item) {
      sails.log.error(`Check delivery error delivery is not valid:  !delivery.cost && !delivery.item`)
      return false
    } else {
      if (delivery.cost && typeof delivery.cost !== "number") {
        sails.log.error(`Check delivery error delivery is not valid:  delivery.cost not number`)
        return false
      }

      if (delivery.item && typeof delivery.item !== "string") {
        sails.log.error(`Check delivery error delivery is not valid:  delivery.item not string`)
        return false
      }
    }

    return true;
  }

  sails.log.error(`Check delivery error delivery is not valid:  ${JSON.stringify(delivery)}`)
  return false;
}