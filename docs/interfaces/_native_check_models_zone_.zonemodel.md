[@webresto/core - v0.7.0-rc1](../README.md) › [Globals](../globals.md) › ["native-check/models/Zone"](../modules/_native_check_models_zone_.md) › [ZoneModel](_native_check_models_zone_.zonemodel.md)

# Interface: ZoneModel

## Hierarchy

* [ORMModel](_core_modelshelp_ormmodel_.ormmodel.md)‹[Zone](_native_check_models_zone_.zone.md)›

  ↳ **ZoneModel**

## Index

### Methods

* [count](_native_check_models_zone_.zonemodel.md#count)
* [create](_native_check_models_zone_.zonemodel.md#create)
* [destroy](_native_check_models_zone_.zonemodel.md#destroy)
* [find](_native_check_models_zone_.zonemodel.md#find)
* [findOne](_native_check_models_zone_.zonemodel.md#findone)
* [findOrCreate](_native_check_models_zone_.zonemodel.md#findorcreate)
* [getDeliveryCoast](_native_check_models_zone_.zonemodel.md#getdeliverycoast)
* [getMapAdapter](_native_check_models_zone_.zonemodel.md#getmapadapter)
* [stream](_native_check_models_zone_.zonemodel.md#stream)
* [update](_native_check_models_zone_.zonemodel.md#update)

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

▸ **create**(`params`: any): *WaterlinePromise‹[Zone](_native_check_models_zone_.zone.md)›*

*Inherited from [ORMModel](_core_modelshelp_ormmodel_.ormmodel.md).[create](_core_modelshelp_ormmodel_.ormmodel.md#create)*

Defined in @webresto/core/modelsHelp/ORMModel.ts:7

**Parameters:**

Name | Type |
------ | ------ |
`params` | any |

**Returns:** *WaterlinePromise‹[Zone](_native_check_models_zone_.zone.md)›*

▸ **create**(`params`: any[]): *WaterlinePromise‹[Zone](_native_check_models_zone_.zone.md)[]›*

*Inherited from [ORMModel](_core_modelshelp_ormmodel_.ormmodel.md).[create](_core_modelshelp_ormmodel_.ormmodel.md#create)*

Defined in @webresto/core/modelsHelp/ORMModel.ts:8

**Parameters:**

Name | Type |
------ | ------ |
`params` | any[] |

**Returns:** *WaterlinePromise‹[Zone](_native_check_models_zone_.zone.md)[]›*

___

###  destroy

▸ **destroy**(`criteria`: any): *WaterlinePromise‹[Zone](_native_check_models_zone_.zone.md)[]›*

*Inherited from [ORMModel](_core_modelshelp_ormmodel_.ormmodel.md).[destroy](_core_modelshelp_ormmodel_.ormmodel.md#destroy)*

Defined in @webresto/core/modelsHelp/ORMModel.ts:19

**Parameters:**

Name | Type |
------ | ------ |
`criteria` | any |

**Returns:** *WaterlinePromise‹[Zone](_native_check_models_zone_.zone.md)[]›*

▸ **destroy**(`criteria`: any[]): *WaterlinePromise‹[Zone](_native_check_models_zone_.zone.md)[]›*

*Inherited from [ORMModel](_core_modelshelp_ormmodel_.ormmodel.md).[destroy](_core_modelshelp_ormmodel_.ormmodel.md#destroy)*

Defined in @webresto/core/modelsHelp/ORMModel.ts:20

**Parameters:**

Name | Type |
------ | ------ |
`criteria` | any[] |

**Returns:** *WaterlinePromise‹[Zone](_native_check_models_zone_.zone.md)[]›*

___

###  find

▸ **find**(`criteria?`: any): *QueryBuilder‹[Zone](_native_check_models_zone_.zone.md)[]›*

*Inherited from [ORMModel](_core_modelshelp_ormmodel_.ormmodel.md).[find](_core_modelshelp_ormmodel_.ormmodel.md#find)*

Defined in @webresto/core/modelsHelp/ORMModel.ts:10

**Parameters:**

Name | Type |
------ | ------ |
`criteria?` | any |

**Returns:** *QueryBuilder‹[Zone](_native_check_models_zone_.zone.md)[]›*

___

###  findOne

▸ **findOne**(`criteria?`: any): *QueryBuilder‹[Zone](_native_check_models_zone_.zone.md)›*

*Inherited from [ORMModel](_core_modelshelp_ormmodel_.ormmodel.md).[findOne](_core_modelshelp_ormmodel_.ormmodel.md#findone)*

Defined in @webresto/core/modelsHelp/ORMModel.ts:12

**Parameters:**

Name | Type |
------ | ------ |
`criteria?` | any |

**Returns:** *QueryBuilder‹[Zone](_native_check_models_zone_.zone.md)›*

___

###  findOrCreate

▸ **findOrCreate**(`criteria?`: any, `values?`: any): *QueryBuilder‹[Zone](_native_check_models_zone_.zone.md)›*

*Inherited from [ORMModel](_core_modelshelp_ormmodel_.ormmodel.md).[findOrCreate](_core_modelshelp_ormmodel_.ormmodel.md#findorcreate)*

Defined in @webresto/core/modelsHelp/ORMModel.ts:14

**Parameters:**

Name | Type |
------ | ------ |
`criteria?` | any |
`values?` | any |

**Returns:** *QueryBuilder‹[Zone](_native_check_models_zone_.zone.md)›*

___

###  getDeliveryCoast

▸ **getDeliveryCoast**(`street`: string, `home`: number): *Promise‹[Zone](_native_check_models_zone_.zone.md)›*

Defined in @webresto/native-check/models/Zone.ts:57

**Parameters:**

Name | Type |
------ | ------ |
`street` | string |
`home` | number |

**Returns:** *Promise‹[Zone](_native_check_models_zone_.zone.md)›*

___

###  getMapAdapter

▸ **getMapAdapter**(`config`: [MapConfig](_core_adapter_map_mapconfig_.mapconfig.md), `key`: string): *[MapAdapter](../classes/_core_adapter_map_mapadapter_.mapadapter.md)*

Defined in @webresto/native-check/models/Zone.ts:59

**Parameters:**

Name | Type |
------ | ------ |
`config` | [MapConfig](_core_adapter_map_mapconfig_.mapconfig.md) |
`key` | string |

**Returns:** *[MapAdapter](../classes/_core_adapter_map_mapadapter_.mapadapter.md)*

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

▸ **update**(`criteria`: any, `changes`: any): *WaterlinePromise‹[Zone](_native_check_models_zone_.zone.md)[]›*

*Inherited from [ORMModel](_core_modelshelp_ormmodel_.ormmodel.md).[update](_core_modelshelp_ormmodel_.ormmodel.md#update)*

Defined in @webresto/core/modelsHelp/ORMModel.ts:16

**Parameters:**

Name | Type |
------ | ------ |
`criteria` | any |
`changes` | any |

**Returns:** *WaterlinePromise‹[Zone](_native_check_models_zone_.zone.md)[]›*

▸ **update**(`criteria`: any, `changes`: any[]): *WaterlinePromise‹[Zone](_native_check_models_zone_.zone.md)[]›*

*Inherited from [ORMModel](_core_modelshelp_ormmodel_.ormmodel.md).[update](_core_modelshelp_ormmodel_.ormmodel.md#update)*

Defined in @webresto/core/modelsHelp/ORMModel.ts:17

**Parameters:**

Name | Type |
------ | ------ |
`criteria` | any |
`changes` | any[] |

**Returns:** *WaterlinePromise‹[Zone](_native_check_models_zone_.zone.md)[]›*
