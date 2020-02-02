[@webresto/core - v0.7.0-rc1](../README.md) › [Globals](../globals.md) › ["core/models/Image"](../modules/_core_models_image_.md) › [Image](_core_models_image_.image.md)

# Interface: Image

Описывает картинки блюд и групп

## Hierarchy

* [ORM](_core_modelshelp_orm_.orm.md)

  ↳ **Image**

## Index

### Properties

* [dish](_core_models_image_.image.md#optional-dish)
* [group](_core_models_image_.image.md#optional-group)
* [id](_core_models_image_.image.md#id)
* [images](_core_models_image_.image.md#images)
* [uploadDate](_core_models_image_.image.md#uploaddate)

### Methods

* [add](_core_models_image_.image.md#add)
* [destroy](_core_models_image_.image.md#destroy)
* [remove](_core_models_image_.image.md#remove)
* [save](_core_models_image_.image.md#save)

## Properties

### `Optional` dish

• **dish**? : *[Association](../modules/_core_lib_globaltypes_.__global.md#association)‹[Dish](_core_models_dish_.dish.md)›*

Defined in @webresto/core/models/Image.ts:52

___

### `Optional` group

• **group**? : *[Association](../modules/_core_lib_globaltypes_.__global.md#association)‹[Group](_core_models_group_.group.md)›*

Defined in @webresto/core/models/Image.ts:53

___

###  id

• **id**: *string*

Defined in @webresto/core/models/Image.ts:50

___

###  images

• **images**: *any*

Defined in @webresto/core/models/Image.ts:51

___

###  uploadDate

• **uploadDate**: *string*

Defined in @webresto/core/models/Image.ts:54

## Methods

###  add

▸ **add**(): *any*

*Inherited from [ORM](_core_modelshelp_orm_.orm.md).[add](_core_modelshelp_orm_.orm.md#add)*

Defined in @webresto/core/modelsHelp/ORM.ts:11

**Returns:** *any*

___

###  destroy

▸ **destroy**(): *Promise‹void›*

*Inherited from [ORM](_core_modelshelp_orm_.orm.md).[destroy](_core_modelshelp_orm_.orm.md#destroy)*

Defined in @webresto/core/modelsHelp/ORM.ts:5

**Returns:** *Promise‹void›*

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
