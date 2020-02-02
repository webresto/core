[@webresto/core - v0.7.0-rc1](../README.md) › [Globals](../globals.md) › ["core/models/Cart"](../modules/_core_models_cart_.md) › [CartModel](_core_models_cart_.cartmodel.md)

# Interface: CartModel

Описывает класс Cart, содержит статические методы, используется для ORM

## Hierarchy

* [ORMModel](_core_modelshelp_ormmodel_.ormmodel.md)‹[Cart](_core_models_cart_.cart.md)›

  ↳ **CartModel**

## Index

### Methods

* [count](_core_models_cart_.cartmodel.md#count)
* [countCart](_core_models_cart_.cartmodel.md#countcart)
* [create](_core_models_cart_.cartmodel.md#create)
* [destroy](_core_models_cart_.cartmodel.md#destroy)
* [find](_core_models_cart_.cartmodel.md#find)
* [findOne](_core_models_cart_.cartmodel.md#findone)
* [findOrCreate](_core_models_cart_.cartmodel.md#findorcreate)
* [returnFullCart](_core_models_cart_.cartmodel.md#returnfullcart)
* [stream](_core_models_cart_.cartmodel.md#stream)
* [update](_core_models_cart_.cartmodel.md#update)

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

###  countCart

▸ **countCart**(`cart`: [Cart](_core_models_cart_.cart.md)): *any*

Defined in @webresto/core/models/Cart.ts:959

Считает количество, вес и прочие данные о корзине в зависимости от полоенных блюд

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`cart` | [Cart](_core_models_cart_.cart.md) |   |

**Returns:** *any*

___

###  create

▸ **create**(`params`: any): *WaterlinePromise‹[Cart](_core_models_cart_.cart.md)›*

*Inherited from [ORMModel](_core_modelshelp_ormmodel_.ormmodel.md).[create](_core_modelshelp_ormmodel_.ormmodel.md#create)*

Defined in @webresto/core/modelsHelp/ORMModel.ts:7

**Parameters:**

Name | Type |
------ | ------ |
`params` | any |

**Returns:** *WaterlinePromise‹[Cart](_core_models_cart_.cart.md)›*

▸ **create**(`params`: any[]): *WaterlinePromise‹[Cart](_core_models_cart_.cart.md)[]›*

*Inherited from [ORMModel](_core_modelshelp_ormmodel_.ormmodel.md).[create](_core_modelshelp_ormmodel_.ormmodel.md#create)*

Defined in @webresto/core/modelsHelp/ORMModel.ts:8

**Parameters:**

Name | Type |
------ | ------ |
`params` | any[] |

**Returns:** *WaterlinePromise‹[Cart](_core_models_cart_.cart.md)[]›*

___

###  destroy

▸ **destroy**(`criteria`: any): *WaterlinePromise‹[Cart](_core_models_cart_.cart.md)[]›*

*Inherited from [ORMModel](_core_modelshelp_ormmodel_.ormmodel.md).[destroy](_core_modelshelp_ormmodel_.ormmodel.md#destroy)*

Defined in @webresto/core/modelsHelp/ORMModel.ts:19

**Parameters:**

Name | Type |
------ | ------ |
`criteria` | any |

**Returns:** *WaterlinePromise‹[Cart](_core_models_cart_.cart.md)[]›*

▸ **destroy**(`criteria`: any[]): *WaterlinePromise‹[Cart](_core_models_cart_.cart.md)[]›*

*Inherited from [ORMModel](_core_modelshelp_ormmodel_.ormmodel.md).[destroy](_core_modelshelp_ormmodel_.ormmodel.md#destroy)*

Defined in @webresto/core/modelsHelp/ORMModel.ts:20

**Parameters:**

Name | Type |
------ | ------ |
`criteria` | any[] |

**Returns:** *WaterlinePromise‹[Cart](_core_models_cart_.cart.md)[]›*

___

###  find

▸ **find**(`criteria?`: any): *QueryBuilder‹[Cart](_core_models_cart_.cart.md)[]›*

*Inherited from [ORMModel](_core_modelshelp_ormmodel_.ormmodel.md).[find](_core_modelshelp_ormmodel_.ormmodel.md#find)*

Defined in @webresto/core/modelsHelp/ORMModel.ts:10

**Parameters:**

Name | Type |
------ | ------ |
`criteria?` | any |

**Returns:** *QueryBuilder‹[Cart](_core_models_cart_.cart.md)[]›*

___

###  findOne

▸ **findOne**(`criteria?`: any): *QueryBuilder‹[Cart](_core_models_cart_.cart.md)›*

*Inherited from [ORMModel](_core_modelshelp_ormmodel_.ormmodel.md).[findOne](_core_modelshelp_ormmodel_.ormmodel.md#findone)*

Defined in @webresto/core/modelsHelp/ORMModel.ts:12

**Parameters:**

Name | Type |
------ | ------ |
`criteria?` | any |

**Returns:** *QueryBuilder‹[Cart](_core_models_cart_.cart.md)›*

___

###  findOrCreate

▸ **findOrCreate**(`criteria?`: any, `values?`: any): *QueryBuilder‹[Cart](_core_models_cart_.cart.md)›*

*Inherited from [ORMModel](_core_modelshelp_ormmodel_.ormmodel.md).[findOrCreate](_core_modelshelp_ormmodel_.ormmodel.md#findorcreate)*

Defined in @webresto/core/modelsHelp/ORMModel.ts:14

**Parameters:**

Name | Type |
------ | ------ |
`criteria?` | any |
`values?` | any |

**Returns:** *QueryBuilder‹[Cart](_core_models_cart_.cart.md)›*

___

###  returnFullCart

▸ **returnFullCart**(`cart`: [Cart](_core_models_cart_.cart.md)): *Promise‹[Cart](_core_models_cart_.cart.md)›*

Defined in @webresto/core/models/Cart.ts:953

Возвращает корзину со всем популярищациями, то есть каждый CartDish в заданой cart имеет dish и modifiers, каждый dish
содержит в себе свои картинки, каждый модификатор внутри cart.dishes и каждого dish содержит группу модификаторов и
самоблюдо модификатора и тд.

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`cart` | [Cart](_core_models_cart_.cart.md) |   |

**Returns:** *Promise‹[Cart](_core_models_cart_.cart.md)›*

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

▸ **update**(`criteria`: any, `changes`: any): *WaterlinePromise‹[Cart](_core_models_cart_.cart.md)[]›*

*Inherited from [ORMModel](_core_modelshelp_ormmodel_.ormmodel.md).[update](_core_modelshelp_ormmodel_.ormmodel.md#update)*

Defined in @webresto/core/modelsHelp/ORMModel.ts:16

**Parameters:**

Name | Type |
------ | ------ |
`criteria` | any |
`changes` | any |

**Returns:** *WaterlinePromise‹[Cart](_core_models_cart_.cart.md)[]›*

▸ **update**(`criteria`: any, `changes`: any[]): *WaterlinePromise‹[Cart](_core_models_cart_.cart.md)[]›*

*Inherited from [ORMModel](_core_modelshelp_ormmodel_.ormmodel.md).[update](_core_modelshelp_ormmodel_.ormmodel.md#update)*

Defined in @webresto/core/modelsHelp/ORMModel.ts:17

**Parameters:**

Name | Type |
------ | ------ |
`criteria` | any |
`changes` | any[] |

**Returns:** *WaterlinePromise‹[Cart](_core_models_cart_.cart.md)[]›*
