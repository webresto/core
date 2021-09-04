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
const actions = {
    /**
     * Add dish in cart
     * @param params(cart.id,  dishesId)
     * @return Promise<Cart>
     */
    async addDish(cart, params) {
        const dishesId = params.dishesId;
        if (!cart && !cart.id)
            throw 'cart is required';
        if (!dishesId || !dishesId.length)
            throw 'dishIds (array of strings) is required as second element of params';
        await Promise.each(dishesId, async (dishId) => {
            const dish = await Dish.findOne(dishId);
            await Cart.addDish(cart.id, dish, params.amount, params.modifiers, params.comment, 'delivery');
        });
        return cart;
    },
    /**
     * Set delivery cost
     * @param params(cart.id,  deliveryCost)
     * @returns {Promise<>}
     */
    async delivery(cart, params) {
        sails.log.debug(">>> action > delivery");
        sails.log.debug("cart", JSON.stringify(cart));
        if (!cart && !cart.id)
            throw 'cart is required';
        const deliveryCost = params.deliveryCost;
        const deliveryItem = params.deliveryItem;
        if (deliveryCost === undefined && !deliveryItem)
            throw 'one of deliveryCost or deliveryItem is required';
        if (deliveryCost && typeof deliveryCost !== 'number')
            throw 'deliveryCost (float) is required as second element of params';
        if (deliveryItem && typeof deliveryItem !== 'string')
            throw 'deliveryCost (string) is required as second element of params';
        if (deliveryItem) {
            const item = await Dish.findOne({ rmsId: deliveryItem });
            if (!item)
                throw 'deliveryItem with rmsId ' + deliveryItem + ' not found';
            cart.deliveryCost = item.price;
            cart.deliveryItem = item.id;
        }
        else {
            cart.deliveryCost = deliveryCost;
        }
        if (cart.state !== 'CHECKOUT')
            await Cart.next(cart.id, 'CHECKOUT');
        return cart;
    },
    /**
     * Reset all cart action
     * @param cartId
     * @returns {Promise<>}
     */
    async reset(cart) {
        if (!cart && !cart.id)
            throw 'cart is required';
        cart.deliveryDescription = "";
        cart.message = "";
        console.log(cart);
        if (cart.state !== 'CART')
            await Cart.next(cart.id, 'CART');
        const removeDishes = await CartDish.find({ cart: cart.id, addedBy: 'delivery' });
        for await (let dish of removeDishes) {
            Cart.removeDish(cart.id, dish, 100000);
        }
        return cart;
    },
    /**
     * Add delivery description in cart
     * @param params(cart.id,  description)
     * @return Promise<Cart>
     */
    async setDeliveryDescription(cart, params) {
        const cartId = params.cartId;
        const description = params.description;
        if (!cart && !cart.id)
            throw 'cart is required';
        if (!description) {
            throw 'description (string) is required as second element of params';
        }
        //const cart = await Cart.findOne(cartId);
        if (!cart)
            throw 'cart with id ' + cartId + ' not found';
        cart.deliveryDescription = cart.deliveryDescription || "";
        cart.deliveryDescription += description + '\n';
        await Cart.update({ id: cart.id }, cart).fetch();
        return cart;
    },
    async reject(cart, params) {
        if (!cart && !cart.id)
            throw 'cart is required';
        ;
        await Cart.next(cart.id, 'CART');
        return cart;
    },
    async setMessage(cart, params) {
        sails.log.info("CORE > actions > setMessage", params);
        const cartId = params.cartId;
        const message = params.message;
        if (!cart && !cart.id)
            throw 'cart is required';
        if (!message)
            throw 'description (string) is required as second element of params';
        //const cart = await Cart.findOne(cartId);
        if (!cart)
            throw 'cart with id ' + cartId + ' not found';
        cart.message = message;
        await Cart.update({ id: cart.id }, cart).fetch();
        return cart;
    },
    return() {
        return 0;
    }
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
