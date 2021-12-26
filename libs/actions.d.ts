import Order from "../models/Order";
/**
 * Object with functions to action
 * If you wanna add new actions just call addAction('newActionName', function newActionFunction(...) {...}); Also in this
 * way you need to extends Actions interface and cast actions variable to new extended interface.
 *
 * For example:
 *
 * 1. Add new function doStuff
 * ```
 * addAction('doStuff', function(params: ActionParams): Promise<Order> {
 *   const orderId = params.orderId;
 *
 *   if (!orderId)
 *     throw 'orderId (string) is required as first element of params';
 *
 *   const order = await Order.findOne(orderId);
 *   if (!order)
 *     throw 'order with id ' + orderId + ' not found';
 *
 *   sails.log.info('DO STUFF WITH CART', order);
 *
 *   return order;
 * });
 * ```
 *
 * 2. Create new Actions interface
 * ```
 * interface NewActions extends Actions {
 *   doStuff(params: ActionParams): Promise<Order>;
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
     * Add dish in order
     * @param params(order.id,  dishesId)
     * @return Promise<Order>
     */
    addDish(order: Order, params: any): Promise<Order>;
    /**
     * Set delivery cost
     * @param params(order.id,  deliveryCost)
     * @returns {Promise<>}
     */
    delivery(order: Order, params: any): Promise<Order>;
    /**
     * Reset all order action
     * @param orderId
     * @returns {Promise<>}
     */
    reset(order: Order): Promise<Order>;
    /**
     * Add delivery description in order
     * @param params(order.id,  description)
     * @return Promise<Order>
     */
    setDeliveryDescription(order: Order, params: any): Promise<Order>;
    reject(order: Order, params: any): Promise<Order>;
    setMessage(order: Order, params: any): Promise<Order>;
    return(): number;
};
export default actions;
declare type actionFunc1 = (params?: any, ...args: any) => Promise<Order>;
declare type actionFunc2 = (...args: any) => Promise<Order>;
declare type actionFunc = actionFunc1 | actionFunc2;
/**
 * Add new action in actions
 * @param name - new action name
 * @param fn - action function
 */
export declare function addAction(name: string, fn: actionFunc): void;
export declare function getAllActionsName(): string[];
