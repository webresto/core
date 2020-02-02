[@webresto/core - v0.7.0-rc1](../README.md) › [Globals](../globals.md) › ["core/models/Maintenance"](../modules/_core_models_maintenance_.md) › [MaintenanceModel](_core_models_maintenance_.maintenancemodel.md)

# Interface: MaintenanceModel

Описывает класс Maintenance, используется для ORM

## Hierarchy

* [ORMModel](_core_modelshelp_ormmodel_.ormmodel.md)‹[Maintenance](_core_models_maintenance_.maintenance.md)›

  ↳ **MaintenanceModel**

## Index

### Methods

* [count](_core_models_maintenance_.maintenancemodel.md#count)
* [create](_core_models_maintenance_.maintenancemodel.md#create)
* [destroy](_core_models_maintenance_.maintenancemodel.md#destroy)
* [find](_core_models_maintenance_.maintenancemodel.md#find)
* [findOne](_core_models_maintenance_.maintenancemodel.md#findone)
* [findOrCreate](_core_models_maintenance_.maintenancemodel.md#findorcreate)
* [stream](_core_models_maintenance_.maintenancemodel.md#stream)
* [update](_core_models_maintenance_.maintenancemodel.md#update)

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

▸ **create**(`params`: any): *WaterlinePromise‹[Maintenance](_core_models_maintenance_.maintenance.md)›*

*Inherited from [ORMModel](_core_modelshelp_ormmodel_.ormmodel.md).[create](_core_modelshelp_ormmodel_.ormmodel.md#create)*

Defined in @webresto/core/modelsHelp/ORMModel.ts:7

**Parameters:**

Name | Type |
------ | ------ |
`params` | any |

**Returns:** *WaterlinePromise‹[Maintenance](_core_models_maintenance_.maintenance.md)›*

▸ **create**(`params`: any[]): *WaterlinePromise‹[Maintenance](_core_models_maintenance_.maintenance.md)[]›*

*Inherited from [ORMModel](_core_modelshelp_ormmodel_.ormmodel.md).[create](_core_modelshelp_ormmodel_.ormmodel.md#create)*

Defined in @webresto/core/modelsHelp/ORMModel.ts:8

**Parameters:**

Name | Type |
------ | ------ |
`params` | any[] |

**Returns:** *WaterlinePromise‹[Maintenance](_core_models_maintenance_.maintenance.md)[]›*

___

###  destroy

▸ **destroy**(`criteria`: any): *WaterlinePromise‹[Maintenance](_core_models_maintenance_.maintenance.md)[]›*

*Inherited from [ORMModel](_core_modelshelp_ormmodel_.ormmodel.md).[destroy](_core_modelshelp_ormmodel_.ormmodel.md#destroy)*

Defined in @webresto/core/modelsHelp/ORMModel.ts:19

**Parameters:**

Name | Type |
------ | ------ |
`criteria` | any |

**Returns:** *WaterlinePromise‹[Maintenance](_core_models_maintenance_.maintenance.md)[]›*

▸ **destroy**(`criteria`: any[]): *WaterlinePromise‹[Maintenance](_core_models_maintenance_.maintenance.md)[]›*

*Inherited from [ORMModel](_core_modelshelp_ormmodel_.ormmodel.md).[destroy](_core_modelshelp_ormmodel_.ormmodel.md#destroy)*

Defined in @webresto/core/modelsHelp/ORMModel.ts:20

**Parameters:**

Name | Type |
------ | ------ |
`criteria` | any[] |

**Returns:** *WaterlinePromise‹[Maintenance](_core_models_maintenance_.maintenance.md)[]›*

___

###  find

▸ **find**(`criteria?`: any): *QueryBuilder‹[Maintenance](_core_models_maintenance_.maintenance.md)[]›*

*Inherited from [ORMModel](_core_modelshelp_ormmodel_.ormmodel.md).[find](_core_modelshelp_ormmodel_.ormmodel.md#find)*

Defined in @webresto/core/modelsHelp/ORMModel.ts:10

**Parameters:**

Name | Type |
------ | ------ |
`criteria?` | any |

**Returns:** *QueryBuilder‹[Maintenance](_core_models_maintenance_.maintenance.md)[]›*

___

###  findOne

▸ **findOne**(`criteria?`: any): *QueryBuilder‹[Maintenance](_core_models_maintenance_.maintenance.md)›*

*Inherited from [ORMModel](_core_modelshelp_ormmodel_.ormmodel.md).[findOne](_core_modelshelp_ormmodel_.ormmodel.md#findone)*

Defined in @webresto/core/modelsHelp/ORMModel.ts:12

**Parameters:**

Name | Type |
------ | ------ |
`criteria?` | any |

**Returns:** *QueryBuilder‹[Maintenance](_core_models_maintenance_.maintenance.md)›*

___

###  findOrCreate

▸ **findOrCreate**(`criteria?`: any, `values?`: any): *QueryBuilder‹[Maintenance](_core_models_maintenance_.maintenance.md)›*

*Inherited from [ORMModel](_core_modelshelp_ormmodel_.ormmodel.md).[findOrCreate](_core_modelshelp_ormmodel_.ormmodel.md#findorcreate)*

Defined in @webresto/core/modelsHelp/ORMModel.ts:14

**Parameters:**

Name | Type |
------ | ------ |
`criteria?` | any |
`values?` | any |

**Returns:** *QueryBuilder‹[Maintenance](_core_models_maintenance_.maintenance.md)›*

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

▸ **update**(`criteria`: any, `changes`: any): *WaterlinePromise‹[Maintenance](_core_models_maintenance_.maintenance.md)[]›*

*Inherited from [ORMModel](_core_modelshelp_ormmodel_.ormmodel.md).[update](_core_modelshelp_ormmodel_.ormmodel.md#update)*

Defined in @webresto/core/modelsHelp/ORMModel.ts:16

**Parameters:**

Name | Type |
------ | ------ |
`criteria` | any |
`changes` | any |

**Returns:** *WaterlinePromise‹[Maintenance](_core_models_maintenance_.maintenance.md)[]›*

▸ **update**(`criteria`: any, `changes`: any[]): *WaterlinePromise‹[Maintenance](_core_models_maintenance_.maintenance.md)[]›*

*Inherited from [ORMModel](_core_modelshelp_ormmodel_.ormmodel.md).[update](_core_modelshelp_ormmodel_.ormmodel.md#update)*

Defined in @webresto/core/modelsHelp/ORMModel.ts:17

**Parameters:**

Name | Type |
------ | ------ |
`criteria` | any |
`changes` | any[] |

**Returns:** *WaterlinePromise‹[Maintenance](_core_models_maintenance_.maintenance.md)[]›*
