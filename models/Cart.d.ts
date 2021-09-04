import Address from "../interfaces/Address";
import Customer from "../interfaces/Customer";
import PaymentDocument from "./PaymentDocument";
import ORMModel from "../interfaces/ORMModel";
import ORM from "../interfaces/ORM";
import { PaymentResponse } from "../interfaces/Payment";
declare let attributes: any;
declare type Cart = typeof attributes & ORM;
export default Cart;
declare let Model: {
    /**
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
      Cart.update({id: cart.id},cart).fetch();
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
      Cart.update({id: cart.id},cart).fetch();
      await emitter.emit.apply(emitter, [
        "core-cart-after-remove-dish",
        ...arguments,
      ]);
    },
    async setCount(criteria: any, dish: CartDish, amount: number): Promise<void> {
      
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
        Cart.update({id: cart.id},cart).fetch();
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
    */
    setComment(criteria: any, dish: any, comment: string): Promise<void>;
    /**
     * Set cart selfService field. Use this method to change selfService.
     * @param selfService
     */
    setSelfService(criteria: any, selfService: boolean): Promise<void>;
    check(criteria: any, customer?: Customer, isSelfService?: boolean, address?: Address, paymentMethodId?: string): Promise<any>;
    order(criteria: any): Promise<number>;
    payment(criteria: any): Promise<PaymentResponse>;
    paymentMethodId(criteria: any, cart?: any): Promise<string>;
    /**
     * Считает количество, вес и прочие данные о корзине в зависимости от полоенных блюд
     * @param cart
     */
    countCart(criteria: any, cart: any): Promise<any>;
    doPaid(criteria: any, paymentDocument: PaymentDocument): Promise<void>;
};
declare global {
    const Cart: typeof Model & ORMModel<Cart>;
}
