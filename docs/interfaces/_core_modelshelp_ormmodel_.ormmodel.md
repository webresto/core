[@webresto/core - v0.7.0-rc1](../README.md) › [Globals](../globals.md) › ["core/modelsHelp/ORMModel"](../modules/_core_modelshelp_ormmodel_.md) › [ORMModel](_core_modelshelp_ormmodel_.ormmodel.md)

# Interface: ORMModel <**T**>

Описывает ORM представление

## Type parameters

▪ **T**

## Hierarchy

* **ORMModel**

  ↳ [ImageModel](_core_models_image_.imagemodel.md)

  ↳ [DishModel](_core_models_dish_.dishmodel.md)

  ↳ [CartDishModel](_core_models_cartdish_.cartdishmodel.md)

  ↳ [ZoneModel](_native_check_models_zone_.zonemodel.md)

  ↳ [ConditionModel](_core_models_condition_.conditionmodel.md)

  ↳ [GroupModel](_core_models_group_.groupmodel.md)

  ↳ [CartModel](_core_models_cart_.cartmodel.md)

  ↳ [MaintenanceModel](_core_models_maintenance_.maintenancemodel.md)

  ↳ [SystemInfoModel](_core_models_systeminfo_.systeminfomodel.md)

## Index

### Methods

* [count](_core_modelshelp_ormmodel_.ormmodel.md#count)
* [create](_core_modelshelp_ormmodel_.ormmodel.md#create)
* [destroy](_core_modelshelp_ormmodel_.ormmodel.md#destroy)
* [find](_core_modelshelp_ormmodel_.ormmodel.md#find)
* [findOne](_core_modelshelp_ormmodel_.ormmodel.md#findone)
* [findOrCreate](_core_modelshelp_ormmodel_.ormmodel.md#findorcreate)
* [stream](_core_modelshelp_ormmodel_.ormmodel.md#stream)
* [update](_core_modelshelp_ormmodel_.ormmodel.md#update)

## Methods

###  count

▸ **count**(`criteria?`: any): *WaterlinePromise‹number›*

Defined in @webresto/core/modelsHelp/ORMModel.ts:22

**Parameters:**

Name | Type |
------ | ------ |
`criteria?` | any |

**Returns:** *WaterlinePromise‹number›*

▸ **count**(`criteria`: any[]): *WaterlinePromise‹number›*

Defined in @webresto/core/modelsHelp/ORMModel.ts:23

**Parameters:**

Name | Type |
------ | ------ |
`criteria` | any[] |

**Returns:** *WaterlinePromise‹number›*

___

###  create

▸ **create**(`params`: any): *WaterlinePromise‹T›*

Defined in @webresto/core/modelsHelp/ORMModel.ts:7

**Parameters:**

Name | Type |
------ | ------ |
`params` | any |

**Returns:** *WaterlinePromise‹T›*

▸ **create**(`params`: any[]): *WaterlinePromise‹T[]›*

Defined in @webresto/core/modelsHelp/ORMModel.ts:8

**Parameters:**

Name | Type |
------ | ------ |
`params` | any[] |

**Returns:** *WaterlinePromise‹T[]›*

___

###  destroy

▸ **destroy**(`criteria`: any): *WaterlinePromise‹T[]›*

Defined in @webresto/core/modelsHelp/ORMModel.ts:19

**Parameters:**

Name | Type |
------ | ------ |
`criteria` | any |

**Returns:** *WaterlinePromise‹T[]›*

▸ **destroy**(`criteria`: any[]): *WaterlinePromise‹T[]›*

Defined in @webresto/core/modelsHelp/ORMModel.ts:20

**Parameters:**

Name | Type |
------ | ------ |
`criteria` | any[] |

**Returns:** *WaterlinePromise‹T[]›*

___

###  find

▸ **find**(`criteria?`: any): *QueryBuilder‹T[]›*

Defined in @webresto/core/modelsHelp/ORMModel.ts:10

**Parameters:**

Name | Type |
------ | ------ |
`criteria?` | any |

**Returns:** *QueryBuilder‹T[]›*

___

###  findOne

▸ **findOne**(`criteria?`: any): *QueryBuilder‹T›*

Defined in @webresto/core/modelsHelp/ORMModel.ts:12

**Parameters:**

Name | Type |
------ | ------ |
`criteria?` | any |

**Returns:** *QueryBuilder‹T›*

___

###  findOrCreate

▸ **findOrCreate**(`criteria?`: any, `values?`: any): *QueryBuilder‹T›*

Defined in @webresto/core/modelsHelp/ORMModel.ts:14

**Parameters:**

Name | Type |
------ | ------ |
`criteria?` | any |
`values?` | any |

**Returns:** *QueryBuilder‹T›*

___

###  stream

▸ **stream**(`criteria`: any, `writeEnd`: any): *WritableStream | Error*

Defined in @webresto/core/modelsHelp/ORMModel.ts:25

**Parameters:**

Name | Type |
------ | ------ |
`criteria` | any |
`writeEnd` | any |

**Returns:** *WritableStream | Error*

___

###  update

▸ **update**(`criteria`: any, `changes`: any): *WaterlinePromise‹T[]›*

Defined in @webresto/core/modelsHelp/ORMModel.ts:16

**Parameters:**

Name | Type |
------ | ------ |
`criteria` | any |
`changes` | any |

**Returns:** *WaterlinePromise‹T[]›*

▸ **update**(`criteria`: any, `changes`: any[]): *WaterlinePromise‹T[]›*

Defined in @webresto/core/modelsHelp/ORMModel.ts:17

**Parameters:**

Name | Type |
------ | ------ |
`criteria` | any |
`changes` | any[] |

**Returns:** *WaterlinePromise‹T[]›*
