[@webresto/core - v0.7.0-rc1](../README.md) › [Globals](../globals.md) › ["core/models/Condition"](../modules/_core_models_condition_.md) › [Condition](_core_models_condition_.condition.md)

# Interface: Condition

Описывает одно условие с его условиями и действиями для выполнения

## Hierarchy

* [ORM](_core_modelshelp_orm_.orm.md)

  ↳ **Condition**

## Index

### Properties

* [actions](_core_models_condition_.condition.md#actions)
* [causes](_core_models_condition_.condition.md#causes)
* [description](_core_models_condition_.condition.md#description)
* [enable](_core_models_condition_.condition.md#enable)
* [name](_core_models_condition_.condition.md#name)
* [needy](_core_models_condition_.condition.md#needy)
* [weight](_core_models_condition_.condition.md#weight)
* [zones](_core_models_condition_.condition.md#zones)

### Methods

* [add](_core_models_condition_.condition.md#add)
* [check](_core_models_condition_.condition.md#check)
* [destroy](_core_models_condition_.condition.md#destroy)
* [exec](_core_models_condition_.condition.md#exec)
* [hasReturn](_core_models_condition_.condition.md#hasreturn)
* [remove](_core_models_condition_.condition.md#remove)
* [save](_core_models_condition_.condition.md#save)

## Properties

###  actions

• **actions**: *any*

Defined in @webresto/core/models/Condition.ts:176

___

###  causes

• **causes**: *[Cause](_core_modelshelp_cause_.cause.md)*

Defined in @webresto/core/models/Condition.ts:175

___

###  description

• **description**: *string*

Defined in @webresto/core/models/Condition.ts:172

___

###  enable

• **enable**: *boolean*

Defined in @webresto/core/models/Condition.ts:173

___

###  name

• **name**: *string*

Defined in @webresto/core/models/Condition.ts:171

___

###  needy

• **needy**: *boolean*

Defined in @webresto/core/models/Condition.ts:178

___

###  weight

• **weight**: *number*

Defined in @webresto/core/models/Condition.ts:174

___

###  zones

• **zones**: *[Zone](_native_check_models_zone_.zone.md)[]*

Defined in @webresto/core/models/Condition.ts:177

## Methods

###  add

▸ **add**(): *any*

*Inherited from [ORM](_core_modelshelp_orm_.orm.md).[add](_core_modelshelp_orm_.orm.md#add)*

Defined in @webresto/core/modelsHelp/ORM.ts:11

**Returns:** *any*

___

###  check

▸ **check**(`cart`: [Cart](_core_models_cart_.cart.md)): *Promise‹boolean›*

Defined in @webresto/core/models/Condition.ts:184

Проверяет что заданная корзина проходит условия causes текущего Condition

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`cart` | [Cart](_core_models_cart_.cart.md) |   |

**Returns:** *Promise‹boolean›*

___

###  destroy

▸ **destroy**(): *Promise‹void›*

*Inherited from [ORM](_core_modelshelp_orm_.orm.md).[destroy](_core_modelshelp_orm_.orm.md#destroy)*

Defined in @webresto/core/modelsHelp/ORM.ts:5

**Returns:** *Promise‹void›*

___

###  exec

▸ **exec**(`cart`: [Cart](_core_models_cart_.cart.md)): *Promise‹[Cart](_core_models_cart_.cart.md)›*

Defined in @webresto/core/models/Condition.ts:190

Выполняет все actions текущего условия для заданной корзины

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`cart` | [Cart](_core_models_cart_.cart.md) |   |

**Returns:** *Promise‹[Cart](_core_models_cart_.cart.md)›*

___

###  hasReturn

▸ **hasReturn**(): *boolean*

Defined in @webresto/core/models/Condition.ts:195

**Returns:** *boolean*

Возвращает true, если в actions указано return: true или reject: true

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
