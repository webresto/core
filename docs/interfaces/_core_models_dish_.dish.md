[@webresto/core - v0.7.0-rc1](../README.md) › [Globals](../globals.md) › ["core/models/Dish"](../modules/_core_models_dish_.md) › [Dish](_core_models_dish_.dish.md)

# Interface: Dish

Описывает блюдо

## Hierarchy

* [ORM](_core_modelshelp_orm_.orm.md)

* [AdditionalInfo](_core_lib_checkexpression_.additionalinfo.md)

  ↳ **Dish**

## Index

### Properties

* [additionalInfo](_core_models_dish_.dish.md#additionalinfo)
* [balance](_core_models_dish_.dish.md#balance)
* [code](_core_models_dish_.dish.md#code)
* [composition](_core_models_dish_.dish.md#composition)
* [hash](_core_models_dish_.dish.md#hash)
* [id](_core_models_dish_.dish.md#id)
* [images](_core_models_dish_.dish.md#images)
* [isDeleted](_core_models_dish_.dish.md#isdeleted)
* [modifier](_core_models_dish_.dish.md#modifier)
* [modifiers](_core_models_dish_.dish.md#modifiers)
* [name](_core_models_dish_.dish.md#name)
* [order](_core_models_dish_.dish.md#order)
* [parentGroup](_core_models_dish_.dish.md#parentgroup)
* [price](_core_models_dish_.dish.md#price)
* [promo](_core_models_dish_.dish.md#promo)
* [rmsId](_core_models_dish_.dish.md#rmsid)
* [tags](_core_models_dish_.dish.md#tags)
* [visible](_core_models_dish_.dish.md#visible)
* [weight](_core_models_dish_.dish.md#weight)
* [workTime](_core_models_dish_.dish.md#worktime)

### Methods

* [add](_core_models_dish_.dish.md#add)
* [destroy](_core_models_dish_.dish.md#destroy)
* [remove](_core_models_dish_.dish.md#remove)
* [save](_core_models_dish_.dish.md#save)

## Properties

###  additionalInfo

• **additionalInfo**: *string*

Defined in @webresto/core/models/Dish.ts:218

___

###  balance

• **balance**: *number*

Defined in @webresto/core/models/Dish.ts:219

___

###  code

• **code**: *string*

Defined in @webresto/core/models/Dish.ts:230

___

###  composition

• **composition**: *string*

Defined in @webresto/core/models/Dish.ts:227

___

###  hash

• **hash**: *number*

Defined in @webresto/core/models/Dish.ts:228

___

###  id

• **id**: *string*

Defined in @webresto/core/models/Dish.ts:217

___

###  images

• **images**: *[Association](../modules/_core_lib_globaltypes_.__global.md#association)‹[Image](_core_models_image_.image.md)›*

Defined in @webresto/core/models/Dish.ts:225

___

###  isDeleted

• **isDeleted**: *boolean*

Defined in @webresto/core/models/Dish.ts:232

___

###  modifier

• **modifier**: *boolean*

*Inherited from [AdditionalInfo](_core_lib_checkexpression_.additionalinfo.md).[modifier](_core_lib_checkexpression_.additionalinfo.md#modifier)*

Defined in @webresto/core/lib/checkExpression.ts:40

___

###  modifiers

• **modifiers**: *[Modifier](_core_modelshelp_modifier_.modifier.md)[]*

Defined in @webresto/core/models/Dish.ts:220

___

###  name

• **name**: *string*

Defined in @webresto/core/models/Dish.ts:226

___

###  order

• **order**: *number*

Defined in @webresto/core/models/Dish.ts:224

___

###  parentGroup

• **parentGroup**: *[Group](_core_models_group_.group.md)*

Defined in @webresto/core/models/Dish.ts:221

___

###  price

• **price**: *number*

Defined in @webresto/core/models/Dish.ts:223

___

###  promo

• **promo**: *boolean*

*Inherited from [AdditionalInfo](_core_lib_checkexpression_.additionalinfo.md).[promo](_core_lib_checkexpression_.additionalinfo.md#promo)*

Defined in @webresto/core/lib/checkExpression.ts:39

___

###  rmsId

• **rmsId**: *string*

Defined in @webresto/core/models/Dish.ts:229

___

###  tags

• **tags**: *object[]*

Defined in @webresto/core/models/Dish.ts:231

___

###  visible

• **visible**: *boolean*

*Inherited from [AdditionalInfo](_core_lib_checkexpression_.additionalinfo.md).[visible](_core_lib_checkexpression_.additionalinfo.md#visible)*

Defined in @webresto/core/lib/checkExpression.ts:37

___

###  weight

• **weight**: *number*

Defined in @webresto/core/models/Dish.ts:222

___

###  workTime

• **workTime**: *[Time](_core_modelshelp_cause_.time.md)[]*

*Inherited from [AdditionalInfo](_core_lib_checkexpression_.additionalinfo.md).[workTime](_core_lib_checkexpression_.additionalinfo.md#worktime)*

Defined in @webresto/core/lib/checkExpression.ts:38

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
