import Cart from "../models/Cart";
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
 * import actions from "./libs/actions";
 * import NewActions from "<module>/NewActions";
 * const newActions = <NewActions>actions;
 * ```
 */
declare const actions: {
    /**
     * Add dish in cart
     * @param params(cart.id,  dishesId)
     * @return Promise<Cart>
     */
    addDish(cart: Cart, params: any): Promise<Cart>;
    /**
     * Set delivery cost
     * @param params(cart.id,  deliveryCost)
     * @returns {Promise<>}
     */
    delivery(cart: Cart, params: any): Promise<Cart>;
    /**
     * Reset all cart action
     * @param cartId
     * @returns {Promise<>}
     */
    reset(cart: Cart): Promise<Cart>;
    /**
     * Add delivery description in cart
     * @param params(cart.id,  description)
     * @return Promise<Cart>
     */
    setDeliveryDescription(cart: Cart, params: any): Promise<Cart>;
    reject(cart: Cart, params: any): Promise<Cart>;
    setMessage(cart: Cart, params: any): Promise<Cart>;
    return(): number;
};
export default actions;
declare type actionFunc1 = (params?: any, ...args: any) => Promise<Cart>;
declare type actionFunc2 = (...args: any) => Promise<Cart>;
declare type actionFunc = actionFunc1 | actionFunc2;
/**
 * Add new action in actions
 * @param name - new action name
 * @param fn - action function
 */
export declare function addAction(name: string, fn: actionFunc): void;
export declare function getAllActionsName(): string[];
