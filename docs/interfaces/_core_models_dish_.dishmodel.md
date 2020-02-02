[@webresto/core - v0.7.0-rc1](../README.md) › [Globals](../globals.md) › ["core/models/Dish"](../modules/_core_models_dish_.md) › [DishModel](_core_models_dish_.dishmodel.md)

# Interface: DishModel

Описывает класс Dish, содержит статические методы, используется для ORM

## Hierarchy

* [ORMModel](_core_modelshelp_ormmodel_.ormmodel.md)‹[Dish](_core_models_dish_.dish.md)›

  ↳ **DishModel**

## Index

### Methods

* [count](_core_models_dish_.dishmodel.md#count)
* [create](_core_models_dish_.dishmodel.md#create)
* [createOrUpdate](_core_models_dish_.dishmodel.md#createorupdate)
* [destroy](_core_models_dish_.dishmodel.md#destroy)
* [find](_core_models_dish_.dishmodel.md#find)
* [findOne](_core_models_dish_.dishmodel.md#findone)
* [findOrCreate](_core_models_dish_.dishmodel.md#findorcreate)
* [getDishModifiers](_core_models_dish_.dishmodel.md#getdishmodifiers)
* [getDishes](_core_models_dish_.dishmodel.md#getdishes)
* [stream](_core_models_dish_.dishmodel.md#stream)
* [update](_core_models_dish_.dishmodel.md#update)

## Methods

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

▸ **create**(`params`: any): *WaterlinePromise‹[Dish](_core_models_dish_.dish.md)›*

*Inherited from [ORMModel](_core_modelshelp_ormmodel_.ormmodel.md).[create](_core_modelshelp_ormmodel_.ormmodel.md#create)*

Defined in @webresto/core/modelsHelp/ORMModel.ts:7

**Parameters:**

Name | Type |
------ | ------ |
`params` | any |

**Returns:** *WaterlinePromise‹[Dish](_core_models_dish_.dish.md)›*

▸ **create**(`params`: any[]): *WaterlinePromise‹[Dish](_core_models_dish_.dish.md)[]›*

*Inherited from [ORMModel](_core_modelshelp_ormmodel_.ormmodel.md).[create](_core_modelshelp_ormmodel_.ormmodel.md#create)*

Defined in @webresto/core/modelsHelp/ORMModel.ts:8

**Parameters:**

Name | Type |
------ | ------ |
`params` | any[] |

**Returns:** *WaterlinePromise‹[Dish](_core_models_dish_.dish.md)[]›*

___

###  createOrUpdate

▸ **createOrUpdate**(`values`: [Dish](_core_models_dish_.dish.md)): *Promise‹[Dish](_core_models_dish_.dish.md)›*

Defined in @webresto/core/models/Dish.ts:261

Проверяет существует ли блюдо, если не сущестует, то создаёт новое и возвращает его. Если существует, то сверяет
хеш существующего блюда и новых данных, если они совпали, то сразу же отдаёт блюда, если нет, то обновляет его данные
на новые

**Parameters:**

Name | Type |
------ | ------ |
`values` | [Dish](_core_models_dish_.dish.md) |

**Returns:** *Promise‹[Dish](_core_models_dish_.dish.md)›*

обновлённое или созданное блюдо

___

###  destroy

▸ **destroy**(`criteria`: any): *WaterlinePromise‹[Dish](_core_models_dish_.dish.md)[]›*

*Inherited from [ORMModel](_core_modelshelp_ormmodel_.ormmodel.md).[destroy](_core_modelshelp_ormmodel_.ormmodel.md#destroy)*

Defined in @webresto/core/modelsHelp/ORMModel.ts:19

**Parameters:**

Name | Type |
------ | ------ |
`criteria` | any |

**Returns:** *WaterlinePromise‹[Dish](_core_models_dish_.dish.md)[]›*

▸ **destroy**(`criteria`: any[]): *WaterlinePromise‹[Dish](_core_models_dish_.dish.md)[]›*

*Inherited from [ORMModel](_core_modelshelp_ormmodel_.ormmodel.md).[destroy](_core_modelshelp_ormmodel_.ormmodel.md#destroy)*

Defined in @webresto/core/modelsHelp/ORMModel.ts:20

**Parameters:**

Name | Type |
------ | ------ |
`criteria` | any[] |

**Returns:** *WaterlinePromise‹[Dish](_core_models_dish_.dish.md)[]›*

___

###  find

▸ **find**(`criteria?`: any): *QueryBuilder‹[Dish](_core_models_dish_.dish.md)[]›*

*Inherited from [ORMModel](_core_modelshelp_ormmodel_.ormmodel.md).[find](_core_modelshelp_ormmodel_.ormmodel.md#find)*

Defined in @webresto/core/modelsHelp/ORMModel.ts:10

**Parameters:**

Name | Type |
------ | ------ |
`criteria?` | any |

**Returns:** *QueryBuilder‹[Dish](_core_models_dish_.dish.md)[]›*

___

###  findOne

▸ **findOne**(`criteria?`: any): *QueryBuilder‹[Dish](_core_models_dish_.dish.md)›*

*Inherited from [ORMModel](_core_modelshelp_ormmodel_.ormmodel.md).[findOne](_core_modelshelp_ormmodel_.ormmodel.md#findone)*

Defined in @webresto/core/modelsHelp/ORMModel.ts:12

**Parameters:**

Name | Type |
------ | ------ |
`criteria?` | any |

**Returns:** *QueryBuilder‹[Dish](_core_models_dish_.dish.md)›*

___

###  findOrCreate

▸ **findOrCreate**(`criteria?`: any, `values?`: any): *QueryBuilder‹[Dish](_core_models_dish_.dish.md)›*

*Inherited from [ORMModel](_core_modelshelp_ormmodel_.ormmodel.md).[findOrCreate](_core_modelshelp_ormmodel_.ormmodel.md#findorcreate)*

Defined in @webresto/core/modelsHelp/ORMModel.ts:14

**Parameters:**

Name | Type |
------ | ------ |
`criteria?` | any |
`values?` | any |

**Returns:** *QueryBuilder‹[Dish](_core_models_dish_.dish.md)›*

___

###  getDishModifiers

▸ **getDishModifiers**(`dish`: [Dish](_core_models_dish_.dish.md)): *any*

Defined in @webresto/core/models/Dish.ts:252

Популяризирует модификаторы блюда, то есть всем груповым модификаторам дописывает группу и блюда, которые им соответствуют,
а обычным модификаторам дописывает их блюдо.

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`dish` | [Dish](_core_models_dish_.dish.md) |   |

**Returns:** *any*

___

###  getDishes

▸ **getDishes**(`criteria`: any): *Promise‹[Dish](_core_models_dish_.dish.md)[]›*

Defined in @webresto/core/models/Dish.ts:245

Принимает waterline criteria и дописывает, туда isDeleted = false, balance != 0. Таким образом эта функция позволяет
находить в базе блюда по критерию и при этом такие, что с ними можно работать юзеру.

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`criteria` | any | критерии поиска |

**Returns:** *Promise‹[Dish](_core_models_dish_.dish.md)[]›*

найденные блюда

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

▸ **update**(`criteria`: any, `changes`: any): *WaterlinePromise‹[Dish](_core_models_dish_.dish.md)[]›*

*Inherited from [ORMModel](_core_modelshelp_ormmodel_.ormmodel.md).[update](_core_modelshelp_ormmodel_.ormmodel.md#update)*

Defined in @webresto/core/modelsHelp/ORMModel.ts:16

**Parameters:**

Name | Type |
------ | ------ |
`criteria` | any |
`changes` | any |

**Returns:** *WaterlinePromise‹[Dish](_core_models_dish_.dish.md)[]›*

▸ **update**(`criteria`: any, `changes`: any[]): *WaterlinePromise‹[Dish](_core_models_dish_.dish.md)[]›*

*Inherited from [ORMModel](_core_modelshelp_ormmodel_.ormmodel.md).[update](_core_modelshelp_ormmodel_.ormmodel.md#update)*

Defined in @webresto/core/modelsHelp/ORMModel.ts:17

**Parameters:**

Name | Type |
------ | ------ |
`criteria` | any |
`changes` | any[] |

**Returns:** *WaterlinePromise‹[Dish](_core_models_dish_.dish.md)[]›*
