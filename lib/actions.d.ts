import Cart from "@webresto/core/models/Cart";
import Actions, {ActionParams} from "@webresto/core/modelsHelp/Actions";

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
 * import actions from "@webresto/core/lib/actions";
 * import NewActions from "<module>/NewActions";
 * const newActions = <NewActions>actions;
 * ```
 */
declare const actions: Actions;
export default actions;
declare type actionFunc1 = (params?: ActionParams, ...args: any) => Promise<Cart>;
declare type actionFunc2 = (...args: any) => Promise<Cart>;
declare type actionFunc = actionFunc1 | actionFunc2;

/**
 * Add new action in actions
 * @param name - new action name
 * @param fn - action function
 */
export declare function addAction(name: string, fn: actionFunc): void;

export declare function getAllActionsName(): string[];
