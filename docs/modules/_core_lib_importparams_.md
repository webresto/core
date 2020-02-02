[@webresto/core - v0.7.0-rc1](../README.md) › [Globals](../globals.md) › ["core/lib/importParams"](_core_lib_importparams_.md)

# External module: "core/lib/importParams"

## Index

### Type aliases

* [importParamFunction](_core_lib_importparams_.md#importparamfunction)
* [importParamObject](_core_lib_importparams_.md#importparamobject)

### Variables

* [importFns](_core_lib_importparams_.md#let-importfns)

### Functions

* [addImportParam](_core_lib_importparams_.md#addimportparam)
* [default](_core_lib_importparams_.md#default)

## Type aliases

###  importParamFunction

Ƭ **importParamFunction**: *function*

Defined in @webresto/core/lib/importParams.ts:5

#### Type declaration:

▸ (`obj`: [Dish](../interfaces/_core_models_dish_.dish.md) | [Group](../interfaces/_core_models_group_.group.md)): *Promise‹void›*

**Parameters:**

Name | Type |
------ | ------ |
`obj` | [Dish](../interfaces/_core_models_dish_.dish.md) &#124; [Group](../interfaces/_core_models_group_.group.md) |

___

###  importParamObject

Ƭ **importParamObject**: *object*

Defined in @webresto/core/lib/importParams.ts:6

#### Type declaration:

* **fn**: *[importParamFunction](_core_lib_importparams_.md#importparamfunction)*

* **label**: *string*

## Variables

### `Let` importFns

• **importFns**: *[importParamObject](_core_lib_importparams_.md#importparamobject)[]* =  []

Defined in @webresto/core/lib/importParams.ts:11

## Functions

###  addImportParam

▸ **addImportParam**(`label`: string, `fn`: [importParamFunction](_core_lib_importparams_.md#importparamfunction)): *void*

Defined in @webresto/core/lib/importParams.ts:52

Добавление кастомной функции импорта, функция принимает блюдо или группу, может менять их поля как угодно, сохранять
модель после изменений не обязательно, это сделает модуль обработки импорта

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`label` | string | label for debugging |
`fn` | [importParamFunction](_core_lib_importparams_.md#importparamfunction) | function to do  |

**Returns:** *void*

___

###  default

▸ **default**(`obj`: [Dish](../interfaces/_core_models_dish_.dish.md) | [Group](../interfaces/_core_models_group_.group.md)): *Promise‹void›*

Defined in @webresto/core/lib/importParams.ts:11

Параметры импорта блюд и групп при синхронизации из RMS адаптера

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`obj` | [Dish](../interfaces/_core_models_dish_.dish.md) &#124; [Group](../interfaces/_core_models_group_.group.md) |   |

**Returns:** *Promise‹void›*
