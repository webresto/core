[@webresto/core - v0.7.0-rc1](../README.md) › [Globals](../globals.md) › ["core/lib/actions"](_core_lib_actions_.md)

# External module: "core/lib/actions"

## Index

### Type aliases

* [actionFunc](_core_lib_actions_.md#actionfunc)
* [actionFunc1](_core_lib_actions_.md#actionfunc1)
* [actionFunc2](_core_lib_actions_.md#actionfunc2)

### Variables

* [actions](_core_lib_actions_.md#const-actions)

### Functions

* [addAction](_core_lib_actions_.md#addaction)
* [getAllActionsName](_core_lib_actions_.md#getallactionsname)

## Type aliases

###  actionFunc

Ƭ **actionFunc**: *[actionFunc1](_core_lib_actions_.md#actionfunc1) | [actionFunc2](_core_lib_actions_.md#actionfunc2)*

Defined in @webresto/core/lib/actions.ts:227

___

###  actionFunc1

Ƭ **actionFunc1**: *function*

Defined in @webresto/core/lib/actions.ts:225

#### Type declaration:

▸ (`params?`: [ActionParams](../interfaces/_core_modelshelp_actions_.actionparams.md), ...`args`: any): *Promise‹[Cart](../interfaces/_core_models_cart_.cart.md)›*

**Parameters:**

Name | Type |
------ | ------ |
`params?` | [ActionParams](../interfaces/_core_modelshelp_actions_.actionparams.md) |
`...args` | any |

___

###  actionFunc2

Ƭ **actionFunc2**: *function*

Defined in @webresto/core/lib/actions.ts:226

#### Type declaration:

▸ (...`args`: any): *Promise‹[Cart](../interfaces/_core_models_cart_.cart.md)›*

**Parameters:**

Name | Type |
------ | ------ |
`...args` | any |

## Variables

### `Const` actions

• **actions**: *[Actions](../interfaces/_core_modelshelp_actions_.actions.md)* =  {
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

    const cart = await Cart.findOne(cartId);
    if (!cart)
      throw 'cart with id ' + cartId + ' not found';

    await Promise.each(dishesId, async (dishId) => {
      const dish = await Dish.findOne(dishId);
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

    const cart = await Cart.findOne(cartId);

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

    cart.deliveryStatus = 0;
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
  async reset(cartId: string): Promise<Cart> {
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
  async setDeliveryDescription(params: DeliveryDescriptionParams): Promise<Cart> {
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

  async reject(params: ActionParams): Promise<Cart> {
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

  async setMessage(params: MessageParams): Promise<Cart> {
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

  return(): number {
    return 0;
  }
} as Actions

Defined in @webresto/core/lib/actions.ts:50

Object with functions to action
If you wanna add new actions just call addAction('newActionName', function newActionFunction(...) {...}); Also in this
way you need to extends Actions interface and cast actions variable to new extended interface.

For example:

1. Add new function doStuff
```
addAction('doStuff', function(params: ActionParams): Promise<Cart> {
  const cartId = params.cartId;

  if (!cartId)
    throw 'cartId (string) is required as first element of params';

  const cart = await Cart.findOne(cartId);
  if (!cart)
    throw 'cart with id ' + cartId + ' not found';

  sails.log.info('DO STUFF WITH CART', cart);

  return cart;
});
```

2. Create new Actions interface
```
interface NewActions extends Actions {
  doStuff(params: ActionParams): Promise<Cart>;
}
```

3. Export actions variable
```
import actions from "@webresto/core/lib/actions";
import NewActions from "<module>/NewActions";
const newActions = <NewActions>actions;
```

## Functions

###  addAction

▸ **addAction**(`name`: string, `fn`: [actionFunc](_core_lib_actions_.md#actionfunc)): *void*

Defined in @webresto/core/lib/actions.ts:234

Add new action in actions

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`name` | string | new action name |
`fn` | [actionFunc](_core_lib_actions_.md#actionfunc) | action function  |

**Returns:** *void*

___

###  getAllActionsName

▸ **getAllActionsName**(): *string[]*

Defined in @webresto/core/lib/actions.ts:238

**Returns:** *string[]*
