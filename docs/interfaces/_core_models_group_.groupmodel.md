[@webresto/core - v0.7.0-rc1](../README.md) › [Globals](../globals.md) › ["core/models/Group"](../modules/_core_models_group_.md) › [GroupModel](_core_models_group_.groupmodel.md)

# Interface: GroupModel

Описывает класс Group, содержит статические методы, используется для ORM

## Hierarchy

* [ORMModel](_core_modelshelp_ormmodel_.ormmodel.md)‹[Group](_core_models_group_.group.md)›

  ↳ **GroupModel**

## Index

### Methods

* [count](_core_models_group_.groupmodel.md#count)
* [create](_core_models_group_.groupmodel.md#create)
* [createOrUpdate](_core_models_group_.groupmodel.md#createorupdate)
* [destroy](_core_models_group_.groupmodel.md#destroy)
* [find](_core_models_group_.groupmodel.md#find)
* [findOne](_core_models_group_.groupmodel.md#findone)
* [findOrCreate](_core_models_group_.groupmodel.md#findorcreate)
* [getGroup](_core_models_group_.groupmodel.md#getgroup)
* [getGroupBySlug](_core_models_group_.groupmodel.md#getgroupbyslug)
* [getGroups](_core_models_group_.groupmodel.md#getgroups)
* [stream](_core_models_group_.groupmodel.md#stream)
* [update](_core_models_group_.groupmodel.md#update)

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

▸ **create**(`params`: any): *WaterlinePromise‹[Group](_core_models_group_.group.md)›*

*Inherited from [ORMModel](_core_modelshelp_ormmodel_.ormmodel.md).[create](_core_modelshelp_ormmodel_.ormmodel.md#create)*

Defined in @webresto/core/modelsHelp/ORMModel.ts:7

**Parameters:**

Name | Type |
------ | ------ |
`params` | any |

**Returns:** *WaterlinePromise‹[Group](_core_models_group_.group.md)›*

▸ **create**(`params`: any[]): *WaterlinePromise‹[Group](_core_models_group_.group.md)[]›*

*Inherited from [ORMModel](_core_modelshelp_ormmodel_.ormmodel.md).[create](_core_modelshelp_ormmodel_.ormmodel.md#create)*

Defined in @webresto/core/modelsHelp/ORMModel.ts:8

**Parameters:**

Name | Type |
------ | ------ |
`params` | any[] |

**Returns:** *WaterlinePromise‹[Group](_core_models_group_.group.md)[]›*

___

###  createOrUpdate

▸ **createOrUpdate**(`values`: [Group](_core_models_group_.group.md)): *Promise‹[Group](_core_models_group_.group.md)›*

Defined in @webresto/core/models/Group.ts:287

Проверяет существует ли группа, если не сущестует, то создаёт новую и возвращает её. Если существует, то сверяет
хеш существующей группы и новых данных, если они совпали, то сразу же отдаёт группу, если нет, то обновляет её данные
на новые

**Parameters:**

Name | Type |
------ | ------ |
`values` | [Group](_core_models_group_.group.md) |

**Returns:** *Promise‹[Group](_core_models_group_.group.md)›*

обновлённая или созданная группа

___

###  destroy

▸ **destroy**(`criteria`: any): *WaterlinePromise‹[Group](_core_models_group_.group.md)[]›*

*Inherited from [ORMModel](_core_modelshelp_ormmodel_.ormmodel.md).[destroy](_core_modelshelp_ormmodel_.ormmodel.md#destroy)*

Defined in @webresto/core/modelsHelp/ORMModel.ts:19

**Parameters:**

Name | Type |
------ | ------ |
`criteria` | any |

**Returns:** *WaterlinePromise‹[Group](_core_models_group_.group.md)[]›*

▸ **destroy**(`criteria`: any[]): *WaterlinePromise‹[Group](_core_models_group_.group.md)[]›*

*Inherited from [ORMModel](_core_modelshelp_ormmodel_.ormmodel.md).[destroy](_core_modelshelp_ormmodel_.ormmodel.md#destroy)*

Defined in @webresto/core/modelsHelp/ORMModel.ts:20

**Parameters:**

Name | Type |
------ | ------ |
`criteria` | any[] |

**Returns:** *WaterlinePromise‹[Group](_core_models_group_.group.md)[]›*

___

###  find

▸ **find**(`criteria?`: any): *QueryBuilder‹[Group](_core_models_group_.group.md)[]›*

*Inherited from [ORMModel](_core_modelshelp_ormmodel_.ormmodel.md).[find](_core_modelshelp_ormmodel_.ormmodel.md#find)*

Defined in @webresto/core/modelsHelp/ORMModel.ts:10

**Parameters:**

Name | Type |
------ | ------ |
`criteria?` | any |

**Returns:** *QueryBuilder‹[Group](_core_models_group_.group.md)[]›*

___

###  findOne

▸ **findOne**(`criteria?`: any): *QueryBuilder‹[Group](_core_models_group_.group.md)›*

*Inherited from [ORMModel](_core_modelshelp_ormmodel_.ormmodel.md).[findOne](_core_modelshelp_ormmodel_.ormmodel.md#findone)*

Defined in @webresto/core/modelsHelp/ORMModel.ts:12

**Parameters:**

Name | Type |
------ | ------ |
`criteria?` | any |

**Returns:** *QueryBuilder‹[Group](_core_models_group_.group.md)›*

___

###  findOrCreate

▸ **findOrCreate**(`criteria?`: any, `values?`: any): *QueryBuilder‹[Group](_core_models_group_.group.md)›*

*Inherited from [ORMModel](_core_modelshelp_ormmodel_.ormmodel.md).[findOrCreate](_core_modelshelp_ormmodel_.ormmodel.md#findorcreate)*

Defined in @webresto/core/modelsHelp/ORMModel.ts:14

**Parameters:**

Name | Type |
------ | ------ |
`criteria?` | any |
`values?` | any |

**Returns:** *QueryBuilder‹[Group](_core_models_group_.group.md)›*

___

###  getGroup

▸ **getGroup**(`groupId`: string): *Promise‹[Group](_core_models_group_.group.md)›*

Defined in @webresto/core/models/Group.ts:269

Возвращает группу с заданным id

**`throws`** ошибка получения группы

**`fires`** group:core-group-get-groups - результат выполнения в формате {groups: {[groupId]:Group}, errors: {[groupId]: error}}

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`groupId` | string | id группы |

**Returns:** *Promise‹[Group](_core_models_group_.group.md)›*

запрашиваемая группа

___

###  getGroupBySlug

▸ **getGroupBySlug**(`groupSlug`: string): *Promise‹[Group](_core_models_group_.group.md)›*

Defined in @webresto/core/models/Group.ts:278

Возвращает группу с заданным slug'ом

**`throws`** ошибка получения группы

**`fires`** group:core-group-get-groups - результат выполнения в формате {groups: {[groupId]:Group}, errors: {[groupId]: error}}

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`groupSlug` | string | slug группы |

**Returns:** *Promise‹[Group](_core_models_group_.group.md)›*

запрашиваемая группа

___

###  getGroups

▸ **getGroups**(`groupsId`: string[]): *Promise‹object›*

Defined in @webresto/core/models/Group.ts:260

Возвращает объект с группами и ошибками получения этих самых групп.

**`fires`** group:core-group-get-groups - результат выполнения в формате {groups: {[groupId]:Group}, errors: {[groupId]: error}}

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`groupsId` | string[] | массив id групп, которые следует получить |

**Returns:** *Promise‹object›*

Object {
  groups: [],
  errors: {}
}
где groups это массив, запрошеных групп с полным отображением вложенности, то есть с их блюдами, у блюд их модфикаторы
и картинки, есть картинки группы и тд, а errors это объект, в котором ключи это группы, которые невозможно получить
по некоторой приниче, значения этого объекта это причины по которым группа не была получена.

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

▸ **update**(`criteria`: any, `changes`: any): *WaterlinePromise‹[Group](_core_models_group_.group.md)[]›*

*Inherited from [ORMModel](_core_modelshelp_ormmodel_.ormmodel.md).[update](_core_modelshelp_ormmodel_.ormmodel.md#update)*

Defined in @webresto/core/modelsHelp/ORMModel.ts:16

**Parameters:**

Name | Type |
------ | ------ |
`criteria` | any |
`changes` | any |

**Returns:** *WaterlinePromise‹[Group](_core_models_group_.group.md)[]›*

▸ **update**(`criteria`: any, `changes`: any[]): *WaterlinePromise‹[Group](_core_models_group_.group.md)[]›*

*Inherited from [ORMModel](_core_modelshelp_ormmodel_.ormmodel.md).[update](_core_modelshelp_ormmodel_.ormmodel.md#update)*

Defined in @webresto/core/modelsHelp/ORMModel.ts:17

**Parameters:**

Name | Type |
------ | ------ |
`criteria` | any |
`changes` | any[] |

**Returns:** *WaterlinePromise‹[Group](_core_models_group_.group.md)[]›*
