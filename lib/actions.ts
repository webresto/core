import Cart from "@webresto/core/models/Cart";
import Dish from "@webresto/core/models/Dish";
import Modifier from "@webresto/core/modelsHelp/Modifier";
import CartDish from "@webresto/core/models/CartDish";

// @ts-ignore
const Promise = require('bluebird');

declare const Cart;
declare const Dish;
declare const CartDish;

export default {
  /**
   * Add dish in cart
   * @param params(cartId, dishesId)
   * @return Promise<Cart>
   */
  async addDish(params: AddDishParams): Promise<Cart> {
    const cartId = params.cartId;
    const dishesId = params.dishesId;

    if (!cartId)
      throw 'cartId (string) is required as first element of params';

    if (!dishesId || !dishesId.length)
      throw 'dishIds (array of strings) is required as second element of params';

    const cart = <Cart>await Cart.findOne(cartId);
    if (!cart)
      throw 'cart with id ' + cartId + ' not found';

    await Promise.each(dishesId, async (dishId: string) => {
      const dish = <Dish>await Dish.findOne(dishId);
      await cart.addDish(dish, params.amount, params.modifiers, params.comment, 'delivery');
    });

    return cart;
  },

  /**
   * Set delivery coast
   * @param params(cartId, deliveryCoast)
   * @returns {Promise<>}
   */
  async delivery(params: DeliveryParams): Promise<Cart> {
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

    const cart = <Cart>await Cart.findOne(cartId);

    if (!cart)
      throw 'cart with id ' + cartId + ' not found';

    if (deliveryItem) {
      const item = <Dish>await Dish.findOne({rmsId: deliveryItem});
      if (!item)
        throw 'deliveryItem with rmsId ' + deliveryItem + ' not found';

      cart.delivery = item.price;
      cart.deliveryItem = item.id;
    } else {
      cart.delivery = deliveryCost;
    }

    cart.deliveryStatus = 0;
    if (cart.state === 'CART')
      await cart.next();

    await cart.save();

    return cart;
  },

  /**
   * Reset all cart action
   * @param cartId
   * @returns {Promise<>}
   */
  async reset(cartId: string): Promise<Cart> {
    if (!cartId)
      throw 'cartId (string) is required as first element of params';

    const cart = <Cart>await Cart.findOne(cartId);

    if (!cart)
      throw 'cart with id ' + cartId + ' not found';

    cart.delivery = 0;
    cart.deliveryStatus = null;
    cart.deliveryDescription = "";
    cart.message = "";
    await cart.next('CART');

    const removeDishes = <CartDish[]>await CartDish.find({cart: cart.id, addedBy: 'delivery'});
    await Promise.each(removeDishes, (dish: CartDish) => {
      cart.removeDish(dish, 100000);
    });

    return cart;
  },

  /**
   * add delivery description in cart
   * @param params(cartId, description)
   * @return Promise<Cart>
   */
  async setDeliveryDescription(params: DeliveryDescriptionParams): Promise<Cart> {
    const cartId = params.cartId;
    const description = params.description;

    if (!cartId)
      throw 'cartId (string) is required as first element of params';

    if (!description) {
      throw 'description (string) is required as second element of params';
    }

    const cart = <Cart>await Cart.findOne(cartId);

    if (!cart)
      throw 'cart with id ' + cartId + ' not found';

    cart.deliveryDescription = cart.deliveryDescription || "";
    cart.deliveryDescription += description + '\n';
    await cart.save();

    return cart;
  },

  async reject(params: ActionParams) {
    const cartId = params.cartId;

    if (!cartId)
      throw 'cartId (string) is required as first element of params';

    const cart = <Cart>await Cart.findOne(cartId);
    if (!cart) {
      throw 'cart with id ' + cartId + ' not found';
    }

    cart.deliveryStatus = null;
    await cart.next('CART');

    return cart;

  },

  async setMessage(params: MessageParams) {
    const cartId = params.cartId;
    const message = params.message;

    if (!cartId)
      throw 'cartId (string) is required as first element of params';

    if (!message)
      throw 'description (string) is required as second element of params';

    const cart = <Cart>await Cart.findOne(cartId);
    if (!cart)
      throw 'cart with id ' + cartId + ' not found';

    cart.message = message;

    await cart.save();
    return cart;
  },

  return() {
    return 0;
  }
};

export interface ActionParams {
  cartId: string
}

interface AddDishParams extends ActionParams {
  dishesId: string[];
  amount?: number;
  modifiers?: Modifier[];
  comment?: string;
}

interface DeliveryParams extends ActionParams {
  deliveryCost?: number;
  deliveryItem?: string;
}

interface DeliveryDescriptionParams extends ActionParams {
  description: string;
}

interface MessageParams extends ActionParams {
  message: string;
}
