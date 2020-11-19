import Cart from "../models/Cart";
import Dish from "../models/Dish";
import CartDish from "../models/CartDish";
import Actions, {
  ActionParams,
  AddDishParams,
  DeliveryDescriptionParams,
  DeliveryParams, MessageParams
} from "../modelsHelp/Actions";

/**
 * Object with functions to action
 * If you wanna add new actions just call addAction('newActionName', function newActionFunction(...) {...}); Also in this
 * way you need to extends Actions interface and cast actions variable to new extended interface.
 *
 * For example:
 *
 * 1. Add new function doStuff
 * ```
 * addAction('doStuff', function(params: ActionParams): Promise<Cart> {
 *   const cartId = params.cartId;
 *
 *   if (!cartId)
 *     throw 'cartId (string) is required as first element of params';
 *
 *   const cart = await Cart.findOne(cartId);
 *   if (!cart)
 *     throw 'cart with id ' + cartId + ' not found';
 *
 *   sails.log.info('DO STUFF WITH CART', cart);
 *
 *   return cart;
 * });
 * ```
 *
 * 2. Create new Actions interface
 * ```
 * interface NewActions extends Actions {
 *   doStuff(params: ActionParams): Promise<Cart>;
 * }
 * ```
 *
 * 3. Export actions variable
 * ```
 * import actions from "./lib/actions";
 * import NewActions from "<module>/NewActions";
 * const newActions = <NewActions>actions;
 * ```
 */
const actions = {
  /**
   * Add dish in cart
   * @param params(cartId, dishesId)
   * @return Promise<Cart>
   */
  async addDish(cart: Cart, params: AddDishParams): Promise<Cart> {
    const cartId = params.cartId;
    const dishesId = params.dishesId;

    if (!cartId)
      throw 'cartId (string) is required as first element of params';

    if (!dishesId || !dishesId.length)
      throw 'dishIds (array of strings) is required as second element of params';

    //const cart = await Cart.findOne(cartId);
    if (!cart)
      throw 'cart with id ' + cartId + ' not found';

    await Promise.each(dishesId, async (dishId) => {
      const dish = await Dish.findOne(dishId);
      await cart.addDish(dish, params.amount, params.modifiers, params.comment, 'delivery');
    });

    return cart;
  },

  /**
   * Set delivery cost
   * @param params(cartId, deliveryCost)
   * @returns {Promise<>}
   */
  async delivery(cart: Cart, params: DeliveryParams): Promise<Cart> {
    const cartId = params.cartId;
    const deliveryCost = params.deliveryCost;
    const deliveryItem = params.deliveryItem;

    if (!cartId)
      throw 'cartId (string) is required as first element of params';

    if (deliveryCost === undefined && !deliveryItem)
      throw 'one of deliveryCost or deliveryItem is required';

    if (deliveryCost && typeof deliveryCost !== 'number')
      throw 'deliveryCost (float) is required as second element of params';

    if (deliveryItem && typeof deliveryItem !== 'string')
      throw 'deliveryCost (string) is required as second element of params';

    //const cart = await Cart.findOne(cartId);

    if (!cart)
      throw 'cart with id ' + cartId + ' not found';

    if (deliveryItem) {
      const item = await Dish.findOne({rmsId: deliveryItem});
      if (!item)
        throw 'deliveryItem with rmsId ' + deliveryItem + ' not found';

      cart.delivery = item.price;
      cart.deliveryItem = item.id;
    } else {
      cart.delivery = deliveryCost;
    }

    // вероятно тут ошибка, так как деливери статус это текст о том какой статус....из РМС
    cart.deliveryStatus = "0";
    if (cart.state !== 'CHECKOUT')
      await cart.next();

    await cart.save();

    return cart;
  },

  /**
   * Reset all cart action
   * @param cartId
   * @returns {Promise<>}
   */
  async reset(cart: Cart): Promise<Cart> {
    if (!cart)
      throw 'cart is required';

    cart.delivery = 0;
    cart.deliveryStatus = null;
    cart.deliveryDescription = "";
    cart.message = "";
    await cart.next('CART');

    const removeDishes = await CartDish.find({cart: cart.id, addedBy: 'delivery'});
    await Promise.each(removeDishes, (dish: CartDish) => {
      cart.removeDish(dish, 100000);
    });

    return cart;
  },

  /**
   * Add delivery description in cart
   * @param params(cartId, description)
   * @return Promise<Cart>
   */
  async setDeliveryDescription(cart: Cart, params: DeliveryDescriptionParams): Promise<Cart> {
    const cartId = params.cartId;
    const description = params.description;

    if (!cart)
      throw 'cart is required';

    if (!description) {
      throw 'description (string) is required as second element of params';
    }

    //const cart = await Cart.findOne(cartId);

    if (!cart)
      throw 'cart with id ' + cartId + ' not found';

    cart.deliveryDescription = cart.deliveryDescription || "";
    cart.deliveryDescription += description + '\n';
    await cart.save();

    return cart;
  },

  async reject(cart: Cart, params: ActionParams): Promise<Cart> {
    if (!cart)
      throw 'cart is required';

    cart.deliveryStatus = null;
    await cart.next('CART');
  },

  async setMessage(cart: Cart, params: MessageParams): Promise<Cart> {
    sails.log.info("CORE > actions > setMessage", params);
    const cartId = params.cartId;
    const message = params.message;

    if (!cart)
      throw 'cart is required';

    if (!message)
      throw 'description (string) is required as second element of params';

    //const cart = await Cart.findOne(cartId);
    if (!cart)
      throw 'cart with id ' + cartId + ' not found';

    cart.message = message;

    await cart.save();
    return cart;
  },

  return(): number {
    return 0;
  }
} as Actions;

export default actions;

type actionFunc1 = (params?: ActionParams, ...args: any) => Promise<Cart>;
type actionFunc2 = (...args: any) => Promise<Cart>;
type actionFunc = actionFunc1 | actionFunc2;

/**
 * Add new action in actions
 * @param name - new action name
 * @param fn - action function
 */
export function addAction(name: string, fn: actionFunc): void {
  actions[name] = fn;
}

export function getAllActionsName(): string[] {
  return Object.keys(actions);
}
