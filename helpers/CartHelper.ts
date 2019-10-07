import Modifier from "@webresto/core/modelsHelp/Modifier";
import Cart from "@webresto/core/models/Cart";
import Dish from "@webresto/core/models/Dish";
import CartDish from "@webresto/core/models/CartDish";

declare const Cart;
declare const Dish;
declare const CartDish;

const uuid = require('uuid/v4');

export default class CartHelper {
  public static async addDishAndReturnCart(data: CartAddData): Promise<Answer> {
    if (!data.dishId)
      throw {
        code: 400,
        message: 'dishId is required'
      };

    let cart;
    if (data.cartId)
      cart = <Cart>await Cart.findOne(data.cartId);
    if (!cart)
      cart = <Cart>await Cart.create({
        id: uuid()
      });

    const dish = <Dish>await Dish.findOne({id: data.dishId});
    if (!dish) throw {
      code: 404,
      message: "Dish not found",
      data: data.dishId
    };

    try {
      cart = await cart.addDish(dish, data.amount, data.modifiers, data.comment, 'user');
      return {
        cart: cart,
        data: dish
      };
    } catch (err) {
      if (err.code === 1) {
        throw {
          code: 400,
          message: "lack the mean",
          data: dish
        }
      }

      throw err;
    }
  }

  public static async removeDish(data: CartRemoveData): Promise<Answer> {
    if (!data.cartId)
      throw {
        code: 400,
        message: 'cartId is required'
      };

    if (!data.dishId)
      throw {
        code: 400,
        message: 'dishId is required'
      };

    let cart = <Cart>await Cart.findOne(data.cartId);
    if (!cart) {
      throw {
        code: 404,
        message: "Cart not found",
        data: data.cartId
      }
    }

    const cartDish = <CartDish>await CartDish.findOne(data.dishId);

    try {
      await cart.removeDish(cartDish, data.amount);
    } catch (e) {
      if (e.code === 1) {
        throw {
          code: 404,
          message: "CartDish not found"
        }
      }
    }

    return {
      cart: cart,
      data: data
    };
  }
}

export interface CartAddData {
  cartId?: string,
  amount?: number,
  modifiers?: Modifier[],
  comment?: string,
  dishId: string
}

export interface CartRemoveData {
  cartId: string,
  amount?: number,
  dishId: string
}

export interface CartSetData {
  cartId: string,
  amount: number,
  dishId: string
}

interface Answer {
  cart: Cart,
  data: any
}
