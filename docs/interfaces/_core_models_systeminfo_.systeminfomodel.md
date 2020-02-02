[@webresto/core - v0.7.0-rc1](../README.md) › [Globals](../globals.md) › ["core/models/SystemInfo"](../modules/_core_models_systeminfo_.md) › [SystemInfoModel](_core_models_systeminfo_.systeminfomodel.md)

# Interface: SystemInfoModel

Описывает класс конфигурации

## Hierarchy

* [ORMModel](_core_modelshelp_ormmodel_.ormmodel.md)‹[SystemInfo](_core_models_systeminfo_.systeminfo.md)›

  ↳ **SystemInfoModel**

## Index

### Methods

* [count](_core_models_systeminfo_.systeminfomodel.md#count)
* [create](_core_models_systeminfo_.systeminfomodel.md#create)
* [destroy](_core_models_systeminfo_.systeminfomodel.md#destroy)
* [find](_core_models_systeminfo_.systeminfomodel.md#find)
* [findOne](_core_models_systeminfo_.systeminfomodel.md#findone)
* [findOrCreate](_core_models_systeminfo_.systeminfomodel.md#findorcreate)
* [stream](_core_models_systeminfo_.systeminfomodel.md#stream)
* [update](_core_models_systeminfo_.systeminfomodel.md#update)
* [use](_core_models_systeminfo_.systeminfomodel.md#use)

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

▸ **create**(`params`: any): *WaterlinePromise‹[SystemInfo](_core_models_systeminfo_.systeminfo.md)›*

*Inherited from [ORMModel](_core_modelshelp_ormmodel_.ormmodel.md).[create](_core_modelshelp_ormmodel_.ormmodel.md#create)*

Defined in @webresto/core/modelsHelp/ORMModel.ts:7

**Parameters:**

Name | Type |
------ | ------ |
`params` | any |

**Returns:** *WaterlinePromise‹[SystemInfo](_core_models_systeminfo_.systeminfo.md)›*

▸ **create**(`params`: any[]): *WaterlinePromise‹[SystemInfo](_core_models_systeminfo_.systeminfo.md)[]›*

*Inherited from [ORMModel](_core_modelshelp_ormmodel_.ormmodel.md).[create](_core_modelshelp_ormmodel_.ormmodel.md#create)*

Defined in @webresto/core/modelsHelp/ORMModel.ts:8

**Parameters:**

Name | Type |
------ | ------ |
`params` | any[] |

**Returns:** *WaterlinePromise‹[SystemInfo](_core_models_systeminfo_.systeminfo.md)[]›*

___

###  destroy

▸ **destroy**(`criteria`: any): *WaterlinePromise‹[SystemInfo](_core_models_systeminfo_.systeminfo.md)[]›*

*Inherited from [ORMModel](_core_modelshelp_ormmodel_.ormmodel.md).[destroy](_core_modelshelp_ormmodel_.ormmodel.md#destroy)*

Defined in @webresto/core/modelsHelp/ORMModel.ts:19

**Parameters:**

Name | Type |
------ | ------ |
`criteria` | any |

**Returns:** *WaterlinePromise‹[SystemInfo](_core_models_systeminfo_.systeminfo.md)[]›*

▸ **destroy**(`criteria`: any[]): *WaterlinePromise‹[SystemInfo](_core_models_systeminfo_.systeminfo.md)[]›*

*Inherited from [ORMModel](_core_modelshelp_ormmodel_.ormmodel.md).[destroy](_core_modelshelp_ormmodel_.ormmodel.md#destroy)*

Defined in @webresto/core/modelsHelp/ORMModel.ts:20

**Parameters:**

Name | Type |
------ | ------ |
`criteria` | any[] |

**Returns:** *WaterlinePromise‹[SystemInfo](_core_models_systeminfo_.systeminfo.md)[]›*

___

###  find

▸ **find**(`criteria?`: any): *QueryBuilder‹[SystemInfo](_core_models_systeminfo_.systeminfo.md)[]›*

*Inherited from [ORMModel](_core_modelshelp_ormmodel_.ormmodel.md).[find](_core_modelshelp_ormmodel_.ormmodel.md#find)*

Defined in @webresto/core/modelsHelp/ORMModel.ts:10

**Parameters:**

Name | Type |
------ | ------ |
`criteria?` | any |

**Returns:** *QueryBuilder‹[SystemInfo](_core_models_systeminfo_.systeminfo.md)[]›*

___

###  findOne

▸ **findOne**(`criteria?`: any): *QueryBuilder‹[SystemInfo](_core_models_systeminfo_.systeminfo.md)›*

*Inherited from [ORMModel](_core_modelshelp_ormmodel_.ormmodel.md).[findOne](_core_modelshelp_ormmodel_.ormmodel.md#findone)*

Defined in @webresto/core/modelsHelp/ORMModel.ts:12

**Parameters:**

Name | Type |
------ | ------ |
`criteria?` | any |

**Returns:** *QueryBuilder‹[SystemInfo](_core_models_systeminfo_.systeminfo.md)›*

___

###  findOrCreate

▸ **findOrCreate**(`criteria?`: any, `values?`: any): *QueryBuilder‹[SystemInfo](_core_models_systeminfo_.systeminfo.md)›*

*Inherited from [ORMModel](_core_modelshelp_ormmodel_.ormmodel.md).[findOrCreate](_core_modelshelp_ormmodel_.ormmodel.md#findorcreate)*

Defined in @webresto/core/modelsHelp/ORMModel.ts:14

**Parameters:**

Name | Type |
------ | ------ |
`criteria?` | any |
`values?` | any |

**Returns:** *QueryBuilder‹[SystemInfo](_core_models_systeminfo_.systeminfo.md)›*

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

▸ **update**(`criteria`: any, `changes`: any): *WaterlinePromise‹[SystemInfo](_core_models_systeminfo_.systeminfo.md)[]›*

*Inherited from [ORMModel](_core_modelshelp_ormmodel_.ormmodel.md).[update](_core_modelshelp_ormmodel_.ormmodel.md#update)*

Defined in @webresto/core/modelsHelp/ORMModel.ts:16

**Parameters:**

Name | Type |
------ | ------ |
`criteria` | any |
`changes` | any |

**Returns:** *WaterlinePromise‹[SystemInfo](_core_models_systeminfo_.systeminfo.md)[]›*

▸ **update**(`criteria`: any, `changes`: any[]): *WaterlinePromise‹[SystemInfo](_core_models_systeminfo_.systeminfo.md)[]›*

*Inherited from [ORMModel](_core_modelshelp_ormmodel_.ormmodel.md).[update](_core_modelshelp_ormmodel_.ormmodel.md#update)*

Defined in @webresto/core/modelsHelp/ORMModel.ts:17

**Parameters:**

Name | Type |
------ | ------ |
`criteria` | any |
`changes` | any[] |

**Returns:** *WaterlinePromise‹[SystemInfo](_core_models_systeminfo_.systeminfo.md)[]›*

___

###  use

▸ **use**<**T**>(`key`: T): *Promise‹[PropType](../modules/_core_lib_globaltypes_.__global.md#proptype)‹[Config](_core_modelshelp_config_.config.md), T››*

Defined in @webresto/core/models/SystemInfo.ts:92

Отдаёт запрашиваемый ключ из запрашиваемого конфига. Если ключ, который запрашивается, отсуствует в базе, то данные
будут взяты из sails.config[config][key] и записаны в базу. При последующих запросах того же ключа будут возвращаться данные
из базы данных. Если указать только один параметр ключ, то данные будут доставаться из sails.config.restocore[key].

**Type parameters:**

▪ **T**: *keyof Config*

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`key` | T | ключ |

**Returns:** *Promise‹[PropType](../modules/_core_lib_globaltypes_.__global.md#proptype)‹[Config](_core_modelshelp_config_.config.md), T››*

найденное значение или 0, если значение не было найдено.

▸ **use**<**T**, **U**>(`config`: U, `key`: T): *Promise‹[PropType](../modules/_core_lib_globaltypes_.__global.md#proptype)‹config[U], T››*

Defined in @webresto/core/models/SystemInfo.ts:101

Отдаёт запрашиваемый ключ из запрашиваемого конфига. Если ключ, который запрашивается, отсуствует в базе, то данные
будут взяты из sails.config[config][key] и записаны в базу. При последующих запросах того же ключа будут возвращаться данные
из базы данных. Если указать только один параметр ключ, то данные будут доставаться из sails.config.restocore[key].

**Type parameters:**

▪ **T**: *keyof config[U]*

▪ **U**: *keyof config*

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`config` | U | конфиг откуда доставать ключ |
`key` | T | ключ, если не указывать второй параметр, то первый будет считаться за ключ |

**Returns:** *Promise‹[PropType](../modules/_core_lib_globaltypes_.__global.md#proptype)‹config[U], T››*

найденное значение или 0, если значение не было найдено.

▸ **use**(`key`: string): *Promise‹any›*

Defined in @webresto/core/models/SystemInfo.ts:102

**Parameters:**

Name | Type |
------ | ------ |
`key` | string |

**Returns:** *Promise‹any›*
