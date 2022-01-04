"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllActionsName = exports.addAction = void 0;
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
const actions = {
    /**
     * Add dish in order
     * @param params(order.id,  dishesId)
     * @return Promise<Order>
     */
    async addDish(order, params) {
        const dishesId = params.dishesId;
        if (!order && !order.id)
            throw "order is required";
        if (!dishesId || !dishesId.length)
            throw "dishIds (array of strings) is required as second element of params";
        for await (let dishId of dishesId) {
            const dish = await Dish.findOne(dishId);
            await Order.addDish(order.id, dish, params.amount, params.modifiers, params.comment, "delivery");
        }
        return order;
    },
    /**
     * Set delivery cost
     * @param params(order.id,  deliveryCost)
     * @returns {Promise<>}
     */
    async delivery(order, params) {
        sails.log.debug(">>> action > delivery");
        sails.log.debug("order", JSON.stringify(order));
        if (!order && !order.id)
            throw "order is required";
        const deliveryCost = params.deliveryCost;
        const deliveryItem = params.deliveryItem;
        if (deliveryCost === undefined && !deliveryItem)
            throw "one of deliveryCost or deliveryItem is required";
        if (deliveryCost && typeof deliveryCost !== "number")
            throw "deliveryCost (float) is required as second element of params";
        if (deliveryItem && typeof deliveryItem !== "string")
            throw "deliveryCost (string) is required as second element of params";
        if (deliveryItem) {
            const item = await Dish.findOne({ rmsId: deliveryItem });
            if (!item)
                throw "deliveryItem with rmsId " + deliveryItem + " not found";
            order.deliveryCost = item.price;
            order.deliveryItem = item.id;
        }
        else {
            order.deliveryCost = deliveryCost;
        }
        if (order.state !== "CHECKOUT")
            await Order.next(order.id, "CHECKOUT");
        return order;
    },
    /**
     * Reset all order action
     * @param orderId
     * @returns {Promise<>}
     */
    async reset(order) {
        if (typeof order === "string") {
            order = await Order.findOne(order);
        }
        if (!order && !order.id)
            throw "order is required";
        order.deliveryDescription = "";
        order.message = "";
        if (order.state !== "CART")
            await Order.next(order.id, "CART");
        const removeDishes = await OrderDish.find({
            order: order.id,
            addedBy: { '!=': 'user' },
        });
        for await (let dish of removeDishes) {
            // TODO: rewrite removeDish for totaly remove
            Order.removeDish(order.id, dish, 100000);
        }
        return await Order.countCart(order.id);
    },
    /**
     * Add delivery description in order
     * @param params(order.id,  description)
     * @return Promise<Order>
     */
    async setDeliveryDescription(order, params) {
        const orderId = params.orderId;
        const description = params.description;
        if (!order && !order.id)
            throw "order is required";
        if (!description) {
            throw "description (string) is required as second element of params";
        }
        //const order = await Order.findOne(orderId);
        if (!order)
            throw "order with id " + orderId + " not found";
        order.deliveryDescription = order.deliveryDescription || "";
        order.deliveryDescription += description + "\n";
        await Order.update({ id: order.id }, order).fetch();
        return order;
    },
    async reject(order, params) {
        if (!order && !order.id)
            throw "order is required";
        await Order.next(order.id, "CART");
        return order;
    },
    async setMessage(order, params) {
        sails.log.info("CORE > actions > setMessage", params);
        const orderId = params.orderId;
        const message = params.message;
        if (!order && !order.id)
            throw "order is required";
        if (!message)
            throw "description (string) is required as second element of params";
        //const order = await Order.findOne(orderId);
        if (!order)
            throw "order with id " + orderId + " not found";
        order.message = message;
        await Order.update({ id: order.id }, order).fetch();
        return order;
    },
    return() {
        return 0;
    },
};
exports.default = actions;
/**
 * Add new action in actions
 * @param name - new action name
 * @param fn - action function
 */
function addAction(name, fn) {
    actions[name] = fn;
}
exports.addAction = addAction;
function getAllActionsName() {
    return Object.keys(actions);
}
exports.getAllActionsName = getAllActionsName;
