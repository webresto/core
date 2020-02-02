[@webresto/core - v0.7.0-rc1](../README.md) › [Globals](../globals.md) › ["core/models/Condition"](../modules/_core_models_condition_.md) › [ConditionModel](_core_models_condition_.conditionmodel.md)

# Interface: ConditionModel

Описывает класс Condition, используется для ORM

## Hierarchy

* [ORMModel](_core_modelshelp_ormmodel_.ormmodel.md)‹[Condition](_core_models_condition_.condition.md)›

  ↳ **ConditionModel**

## Index

### Methods

* [action](_core_models_condition_.conditionmodel.md#action)
* [checkConditionsExists](_core_models_condition_.conditionmodel.md#checkconditionsexists)
* [count](_core_models_condition_.conditionmodel.md#count)
* [create](_core_models_condition_.conditionmodel.md#create)
* [destroy](_core_models_condition_.conditionmodel.md#destroy)
* [find](_core_models_condition_.conditionmodel.md#find)
* [findOne](_core_models_condition_.conditionmodel.md#findone)
* [findOrCreate](_core_models_condition_.conditionmodel.md#findorcreate)
* [getConditions](_core_models_condition_.conditionmodel.md#getconditions)
* [stream](_core_models_condition_.conditionmodel.md#stream)
* [update](_core_models_condition_.conditionmodel.md#update)

## Methods

###  action

▸ **action**(`actionName`: string, `params`: [ActionParams](_core_modelshelp_actions_.actionparams.md)): *Promise‹any›*

Defined in @webresto/core/models/Condition.ts:207

Выполняет действие actionName с параметрами params и возвращает результат его выполнения -- новую корзину

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`actionName` | string | название action |
`params` | [ActionParams](_core_modelshelp_actions_.actionparams.md) | параметры  |

**Returns:** *Promise‹any›*

___

###  checkConditionsExists

▸ **checkConditionsExists**(`cart`: [Cart](_core_models_cart_.cart.md)): *Promise‹boolean›*

Defined in @webresto/core/models/Condition.ts:212

**Parameters:**

Name | Type |
------ | ------ |
`cart` | [Cart](_core_models_cart_.cart.md) |

**Returns:** *Promise‹boolean›*

возвращает наличие условий в проекте. Если условий нет, то false

___

###  count

▸ **count**(`criteria?`: any): *WaterlinePromise‹number›*

*Inherited from [ORMModel](_core_modelshelp_ormmodel_.ormmodel.md).[count](_core_modelshelp_ormmodel_.ormmodel.md#count)*

Defined in @webresto/core/modelsHelp/ORMModel.ts:22

**Parameters:**

Name | Type |
------ | ------ |
`criteria?` | any |

**Returns:** *WaterlinePromise‹number›*

▸ **count**(`criteria`: any[]): *WaterlinePromise‹number›*

*Inherited from [ORMModel](_core_modelshelp_ormmodel_.ormmodel.md).[count](_core_modelshelp_ormmodel_.ormmodel.md#count)*

Defined in @webresto/core/modelsHelp/ORMModel.ts:23

**Parameters:**

Name | Type |
------ | ------ |
`criteria` | any[] |

**Returns:** *WaterlinePromise‹number›*

___

###  create

▸ **create**(`params`: any): *WaterlinePromise‹[Condition](_core_models_condition_.condition.md)›*

*Inherited from [ORMModel](_core_modelshelp_ormmodel_.ormmodel.md).[create](_core_modelshelp_ormmodel_.ormmodel.md#create)*

Defined in @webresto/core/modelsHelp/ORMModel.ts:7

**Parameters:**

Name | Type |
------ | ------ |
`params` | any |

**Returns:** *WaterlinePromise‹[Condition](_core_models_condition_.condition.md)›*

▸ **create**(`params`: any[]): *WaterlinePromise‹[Condition](_core_models_condition_.condition.md)[]›*

*Inherited from [ORMModel](_core_modelshelp_ormmodel_.ormmodel.md).[create](_core_modelshelp_ormmodel_.ormmodel.md#create)*

Defined in @webresto/core/modelsHelp/ORMModel.ts:8

**Parameters:**

Name | Type |
------ | ------ |
`params` | any[] |

**Returns:** *WaterlinePromise‹[Condition](_core_models_condition_.condition.md)[]›*

___

###  destroy

▸ **destroy**(`criteria`: any): *WaterlinePromise‹[Condition](_core_models_condition_.condition.md)[]›*

*Inherited from [ORMModel](_core_modelshelp_ormmodel_.ormmodel.md).[destroy](_core_modelshelp_ormmodel_.ormmodel.md#destroy)*

Defined in @webresto/core/modelsHelp/ORMModel.ts:19

**Parameters:**

Name | Type |
------ | ------ |
`criteria` | any |

**Returns:** *WaterlinePromise‹[Condition](_core_models_condition_.condition.md)[]›*

▸ **destroy**(`criteria`: any[]): *WaterlinePromise‹[Condition](_core_models_condition_.condition.md)[]›*

*Inherited from [ORMModel](_core_modelshelp_ormmodel_.ormmodel.md).[destroy](_core_modelshelp_ormmodel_.ormmodel.md#destroy)*

Defined in @webresto/core/modelsHelp/ORMModel.ts:20

**Parameters:**

Name | Type |
------ | ------ |
`criteria` | any[] |

**Returns:** *WaterlinePromise‹[Condition](_core_models_condition_.condition.md)[]›*

___

###  find

▸ **find**(`criteria?`: any): *QueryBuilder‹[Condition](_core_models_condition_.condition.md)[]›*

*Inherited from [ORMModel](_core_modelshelp_ormmodel_.ormmodel.md).[find](_core_modelshelp_ormmodel_.ormmodel.md#find)*

Defined in @webresto/core/modelsHelp/ORMModel.ts:10

**Parameters:**

Name | Type |
------ | ------ |
`criteria?` | any |

**Returns:** *QueryBuilder‹[Condition](_core_models_condition_.condition.md)[]›*

___

###  findOne

▸ **findOne**(`criteria?`: any): *QueryBuilder‹[Condition](_core_models_condition_.condition.md)›*

*Inherited from [ORMModel](_core_modelshelp_ormmodel_.ormmodel.md).[findOne](_core_modelshelp_ormmodel_.ormmodel.md#findone)*

Defined in @webresto/core/modelsHelp/ORMModel.ts:12

**Parameters:**

Name | Type |
------ | ------ |
`criteria?` | any |

**Returns:** *QueryBuilder‹[Condition](_core_models_condition_.condition.md)›*

___

###  findOrCreate

▸ **findOrCreate**(`criteria?`: any, `values?`: any): *QueryBuilder‹[Condition](_core_models_condition_.condition.md)›*

*Inherited from [ORMModel](_core_modelshelp_ormmodel_.ormmodel.md).[findOrCreate](_core_modelshelp_ormmodel_.ormmodel.md#findorcreate)*

Defined in @webresto/core/modelsHelp/ORMModel.ts:14

**Parameters:**

Name | Type |
------ | ------ |
`criteria?` | any |
`values?` | any |

**Returns:** *QueryBuilder‹[Condition](_core_models_condition_.condition.md)›*

___

###  getConditions

▸ **getConditions**(`street`: string, `home`: number): *Promise‹[Condition](_core_models_condition_.condition.md)[]›*

Defined in @webresto/core/models/Condition.ts:220

Возвращает все условия, которые привязаны в зоне, в которую входят заданные улица-дом

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`street` | string | улица |
`home` | number | дом |

**Returns:** *Promise‹[Condition](_core_models_condition_.condition.md)[]›*

массив условий, которые следует проверять для заданных улицы и дома

___

###  stream

▸ **stream**(`criteria`: any, `writeEnd`: any): *WritableStream | Error*

*Inherited from [ORMModel](_core_modelshelp_ormmodel_.ormmodel.md).[stream](_core_modelshelp_ormmodel_.ormmodel.md#stream)*

Defined in @webresto/core/modelsHelp/ORMModel.ts:25

**Parameters:**

Name | Type |
------ | ------ |
`criteria` | any |
`writeEnd` | any |

**Returns:** *WritableStream | Error*

___

###  update

▸ **update**(`criteria`: any, `changes`: any): *WaterlinePromise‹[Condition](_core_models_condition_.condition.md)[]›*

*Inherited from [ORMModel](_core_modelshelp_ormmodel_.ormmodel.md).[update](_core_modelshelp_ormmodel_.ormmodel.md#update)*

Defined in @webresto/core/modelsHelp/ORMModel.ts:16

**Parameters:**

Name | Type |
------ | ------ |
`criteria` | any |
`changes` | any |

**Returns:** *WaterlinePromise‹[Condition](_core_models_condition_.condition.md)[]›*

▸ **update**(`criteria`: any, `changes`: any[]): *WaterlinePromise‹[Condition](_core_models_condition_.condition.md)[]›*

*Inherited from [ORMModel](_core_modelshelp_ormmodel_.ormmodel.md).[update](_core_modelshelp_ormmodel_.ormmodel.md#update)*

Defined in @webresto/core/modelsHelp/ORMModel.ts:17

**Parameters:**

Name | Type |
------ | ------ |
`criteria` | any |
`changes` | any[] |

**Returns:** *WaterlinePromise‹[Condition](_core_models_condition_.condition.md)[]›*
