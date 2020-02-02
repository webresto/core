[@webresto/core - v0.7.0-rc1](../README.md) › [Globals](../globals.md) › ["core/modelsHelp/Actions"](../modules/_core_modelshelp_actions_.md) › [Actions](_core_modelshelp_actions_.actions.md)

# Interface: Actions

Описывает возможные дейтсвия с корзиной

## Hierarchy

* **Actions**

## Index

### Methods

* [addDish](_core_modelshelp_actions_.actions.md#adddish)
* [delivery](_core_modelshelp_actions_.actions.md#delivery)
* [reject](_core_modelshelp_actions_.actions.md#reject)
* [reset](_core_modelshelp_actions_.actions.md#reset)
* [return](_core_modelshelp_actions_.actions.md#return)
* [setDeliveryDescription](_core_modelshelp_actions_.actions.md#setdeliverydescription)
* [setMessage](_core_modelshelp_actions_.actions.md#setmessage)

## Methods

###  addDish

▸ **addDish**(`params`: [AddDishParams](_core_modelshelp_actions_.adddishparams.md)): *Promise‹[Cart](_core_models_cart_.cart.md)›*

Defined in @webresto/core/modelsHelp/Actions.ts:8

**Parameters:**

Name | Type |
------ | ------ |
`params` | [AddDishParams](_core_modelshelp_actions_.adddishparams.md) |

**Returns:** *Promise‹[Cart](_core_models_cart_.cart.md)›*

___

###  delivery

▸ **delivery**(`params`: [DeliveryParams](_core_modelshelp_actions_.deliveryparams.md)): *Promise‹[Cart](_core_models_cart_.cart.md)›*

Defined in @webresto/core/modelsHelp/Actions.ts:10

**Parameters:**

Name | Type |
------ | ------ |
`params` | [DeliveryParams](_core_modelshelp_actions_.deliveryparams.md) |

**Returns:** *Promise‹[Cart](_core_models_cart_.cart.md)›*

___

###  reject

▸ **reject**(`params`: [ActionParams](_core_modelshelp_actions_.actionparams.md)): *Promise‹[Cart](_core_models_cart_.cart.md)›*

Defined in @webresto/core/modelsHelp/Actions.ts:16

**Parameters:**

Name | Type |
------ | ------ |
`params` | [ActionParams](_core_modelshelp_actions_.actionparams.md) |

**Returns:** *Promise‹[Cart](_core_models_cart_.cart.md)›*

___

###  reset

▸ **reset**(`cartId`: string): *Promise‹[Cart](_core_models_cart_.cart.md)›*

Defined in @webresto/core/modelsHelp/Actions.ts:12

**Parameters:**

Name | Type |
------ | ------ |
`cartId` | string |

**Returns:** *Promise‹[Cart](_core_models_cart_.cart.md)›*

___

###  return

▸ **return**(): *number*

Defined in @webresto/core/modelsHelp/Actions.ts:20

**Returns:** *number*

___

###  setDeliveryDescription

▸ **setDeliveryDescription**(`params`: [DeliveryDescriptionParams](_core_modelshelp_actions_.deliverydescriptionparams.md)): *Promise‹[Cart](_core_models_cart_.cart.md)›*

Defined in @webresto/core/modelsHelp/Actions.ts:14

**Parameters:**

Name | Type |
------ | ------ |
`params` | [DeliveryDescriptionParams](_core_modelshelp_actions_.deliverydescriptionparams.md) |

**Returns:** *Promise‹[Cart](_core_models_cart_.cart.md)›*

___

###  setMessage

▸ **setMessage**(`params`: [MessageParams](_core_modelshelp_actions_.messageparams.md)): *Promise‹[Cart](_core_models_cart_.cart.md)›*

Defined in @webresto/core/modelsHelp/Actions.ts:18

**Parameters:**

Name | Type |
------ | ------ |
`params` | [MessageParams](_core_modelshelp_actions_.messageparams.md) |

**Returns:** *Promise‹[Cart](_core_models_cart_.cart.md)›*
