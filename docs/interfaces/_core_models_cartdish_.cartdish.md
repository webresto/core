[@webresto/core - v0.7.0-rc1](../README.md) › [Globals](../globals.md) › ["core/models/CartDish"](../modules/_core_models_cartdish_.md) › [CartDish](_core_models_cartdish_.cartdish.md)

# Interface: CartDish

Описывает екзмепляр CartDish, то есть блюда в корзине, имеет связь с корзиной, внутри которой находится и с блюдом,
которое описывает

## Hierarchy

* [ORM](_core_modelshelp_orm_.orm.md)

  ↳ **CartDish**

## Index

### Properties

* [amount](_core_models_cartdish_.cartdish.md#amount)
* [comment](_core_models_cartdish_.cartdish.md#comment)
* [dish](_core_models_cartdish_.cartdish.md#dish)
* [id](_core_models_cartdish_.cartdish.md#id)
* [itemTotal](_core_models_cartdish_.cartdish.md#itemtotal)
* [modifiers](_core_models_cartdish_.cartdish.md#modifiers)
* [totalWeight](_core_models_cartdish_.cartdish.md#totalweight)
* [uniqueItems](_core_models_cartdish_.cartdish.md#uniqueitems)
* [weight](_core_models_cartdish_.cartdish.md#weight)

### Methods

* [add](_core_models_cartdish_.cartdish.md#add)
* [destroy](_core_models_cartdish_.cartdish.md#destroy)
* [remove](_core_models_cartdish_.cartdish.md#remove)
* [save](_core_models_cartdish_.cartdish.md#save)

## Properties

###  amount

• **amount**: *number*

Defined in @webresto/core/models/CartDish.ts:68

___

###  comment

• **comment**: *string*

Defined in @webresto/core/models/CartDish.ts:75

___

###  dish

• **dish**: *[Dish](_core_models_dish_.dish.md)*

Defined in @webresto/core/models/CartDish.ts:69

___

###  id

• **id**: *string*

Defined in @webresto/core/models/CartDish.ts:67

___

###  itemTotal

• **itemTotal**: *number*

Defined in @webresto/core/models/CartDish.ts:72

___

###  modifiers

• **modifiers**: *[Modifier](_core_modelshelp_modifier_.modifier.md)[]*

Defined in @webresto/core/models/CartDish.ts:70

___

###  totalWeight

• **totalWeight**: *number*

Defined in @webresto/core/models/CartDish.ts:74

___

###  uniqueItems

• **uniqueItems**: *number*

Defined in @webresto/core/models/CartDish.ts:71

___

###  weight

• **weight**: *number*

Defined in @webresto/core/models/CartDish.ts:73

## Methods

###  add

▸ **add**(): *any*

*Inherited from [ORM](_core_modelshelp_orm_.orm.md).[add](_core_modelshelp_orm_.orm.md#add)*

Defined in @webresto/core/modelsHelp/ORM.ts:11

**Returns:** *any*

___

###  destroy

▸ **destroy**(): *Promise‹void›*

*Inherited from [ORM](_core_modelshelp_orm_.orm.md).[destroy](_core_modelshelp_orm_.orm.md#destroy)*

Defined in @webresto/core/modelsHelp/ORM.ts:5

**Returns:** *Promise‹void›*

___

###  remove

▸ **remove**(): *any*

*Inherited from [ORM](_core_modelshelp_orm_.orm.md).[remove](_core_modelshelp_orm_.orm.md#remove)*

Defined in @webresto/core/modelsHelp/ORM.ts:9

**Returns:** *any*

___

###  save

▸ **save**(): *Promise‹void›*

*Inherited from [ORM](_core_modelshelp_orm_.orm.md).[save](_core_modelshelp_orm_.orm.md#save)*

Defined in @webresto/core/modelsHelp/ORM.ts:7

**Returns:** *Promise‹void›*
