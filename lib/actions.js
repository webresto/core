"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllActionsName = exports.addAction = void 0;
const actions = {
    async addDish(params) {
        const cartId = params.cartId;
        const dishesId = params.dishesId;
        if (!cartId)
            throw 'cartId (string) is required as first element of params';
        if (!dishesId || !dishesId.length)
            throw 'dishIds (array of strings) is required as second element of params';
        const cart = await Cart.findOne(cartId);
        if (!cart)
            throw 'cart with id ' + cartId + ' not found';
        await Promise.each(dishesId, async (dishId) => {
            const dish = await Dish.findOne(dishId);
            await cart.addDish(dish, params.amount, params.modifiers, params.comment, 'delivery');
        });
        return cart;
    },
    async delivery(params) {
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
        const cart = await Cart.findOne(cartId);
        if (!cart)
            throw 'cart with id ' + cartId + ' not found';
        if (deliveryItem) {
            const item = await Dish.findOne({ rmsId: deliveryItem });
            if (!item)
                throw 'deliveryItem with rmsId ' + deliveryItem + ' not found';
            cart.delivery = item.price;
            cart.deliveryItem = item.id;
        }
        else {
            cart.delivery = deliveryCost;
        }
        cart.deliveryStatus = 0;
        if (cart.state !== 'CHECKOUT')
            await cart.next();
        await cart.save();
        return cart;
    },
    async reset(cartId) {
        if (!cartId)
            throw 'cartId (string) is required as first element of params';
        const cart = await Cart.findOne(cartId);
        if (!cart)
            throw 'cart with id ' + cartId + ' not found';
        cart.delivery = 0;
        cart.deliveryStatus = null;
        cart.deliveryDescription = "";
        cart.message = "";
        await cart.next('CART');
        const removeDishes = await CartDish.find({ cart: cart.id, addedBy: 'delivery' });
        await Promise.each(removeDishes, (dish) => {
            cart.removeDish(dish, 100000);
        });
        return cart;
    },
    async setDeliveryDescription(params) {
        const cartId = params.cartId;
        const description = params.description;
        if (!cartId)
            throw 'cartId (string) is required as first element of params';
        if (!description) {
            throw 'description (string) is required as second element of params';
        }
        const cart = await Cart.findOne(cartId);
        if (!cart)
            throw 'cart with id ' + cartId + ' not found';
        cart.deliveryDescription = cart.deliveryDescription || "";
        cart.deliveryDescription += description + '\n';
        await cart.save();
        return cart;
    },
    async reject(params) {
        const cartId = params.cartId;
        if (!cartId)
            throw 'cartId (string) is required as first element of params';
        const cart = await Cart.findOne(cartId);
        if (!cart) {
            throw 'cart with id ' + cartId + ' not found';
        }
        cart.deliveryStatus = null;
        await cart.next('CART');
        return cart;
    },
    async setMessage(params) {
        const cartId = params.cartId;
        const message = params.message;
        if (!cartId)
            throw 'cartId (string) is required as first element of params';
        if (!message)
            throw 'description (string) is required as second element of params';
        const cart = await Cart.findOne(cartId);
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
exports.default = actions;
function addAction(name, fn) {
    actions[name] = fn;
}
exports.addAction = addAction;
function getAllActionsName() {
    return Object.keys(actions);
}
exports.getAllActionsName = getAllActionsName;
