[@webresto/core - v0.7.0-rc1](../README.md) › [Globals](../globals.md) › ["core/models/Group"](../modules/_core_models_group_.md) › [Group](_core_models_group_.group.md)

# Interface: Group

Описывает группу блюд

## Hierarchy

* [ORM](_core_modelshelp_orm_.orm.md)

* [AdditionalInfo](_core_lib_checkexpression_.additionalinfo.md)

  ↳ **Group**

  ↳ [GroupWithAdditionalFields](_core_models_group_.groupwithadditionalfields.md)

## Index

### Properties

* [additionalInfo](_core_models_group_.group.md#additionalinfo)
* [childGroups](_core_models_group_.group.md#childgroups)
* [code](_core_models_group_.group.md#code)
* [description](_core_models_group_.group.md#description)
* [dishes](_core_models_group_.group.md#dishes)
* [dishesTags](_core_models_group_.group.md#dishestags)
* [id](_core_models_group_.group.md#id)
* [images](_core_models_group_.group.md#images)
* [isDeleted](_core_models_group_.group.md#isdeleted)
* [isIncludedInMenu](_core_models_group_.group.md#isincludedinmenu)
* [modifier](_core_models_group_.group.md#modifier)
* [name](_core_models_group_.group.md#name)
* [order](_core_models_group_.group.md#order)
* [parentGroup](_core_models_group_.group.md#parentgroup)
* [promo](_core_models_group_.group.md#promo)
* [seoDescription](_core_models_group_.group.md#seodescription)
* [seoKeywords](_core_models_group_.group.md#seokeywords)
* [seoText](_core_models_group_.group.md#seotext)
* [seoTitle](_core_models_group_.group.md#seotitle)
* [slug](_core_models_group_.group.md#slug)
* [tags](_core_models_group_.group.md#tags)
* [visible](_core_models_group_.group.md#visible)
* [workTime](_core_models_group_.group.md#worktime)

### Methods

* [add](_core_models_group_.group.md#add)
* [destroy](_core_models_group_.group.md#destroy)
* [remove](_core_models_group_.group.md#remove)
* [save](_core_models_group_.group.md#save)

## Properties

###  additionalInfo

• **additionalInfo**: *string*

Defined in @webresto/core/models/Group.ts:223

___

###  childGroups

• **childGroups**: *[Group](_core_models_group_.group.md)[]*

Defined in @webresto/core/models/Group.ts:224

___

###  code

• **code**: *number*

Defined in @webresto/core/models/Group.ts:231

___

###  description

• **description**: *string*

Defined in @webresto/core/models/Group.ts:232

___

###  dishes

• **dishes**: *[Dish](_core_models_dish_.dish.md)[]*

Defined in @webresto/core/models/Group.ts:240

___

###  dishesTags

• **dishesTags**: *object[]*

Defined in @webresto/core/models/Group.ts:239

___

###  id

• **id**: *string*

Defined in @webresto/core/models/Group.ts:222

___

###  images

• **images**: *[Association](../modules/_core_lib_globaltypes_.__global.md#association)‹[Image](_core_models_image_.image.md)›*

Defined in @webresto/core/models/Group.ts:228

___

###  isDeleted

• **isDeleted**: *boolean*

Defined in @webresto/core/models/Group.ts:229

___

###  isIncludedInMenu

• **isIncludedInMenu**: *boolean*

Defined in @webresto/core/models/Group.ts:237

___

###  modifier

• **modifier**: *boolean*

*Inherited from [AdditionalInfo](_core_lib_checkexpression_.additionalinfo.md).[modifier](_core_lib_checkexpression_.additionalinfo.md#modifier)*

Defined in @webresto/core/lib/checkExpression.ts:40

___

###  name

• **name**: *string*

Defined in @webresto/core/models/Group.ts:226

___

###  order

• **order**: *number*

Defined in @webresto/core/models/Group.ts:238

___

###  parentGroup

• **parentGroup**: *[Group](_core_models_group_.group.md)*

Defined in @webresto/core/models/Group.ts:225

___

###  promo

• **promo**: *boolean*

*Inherited from [AdditionalInfo](_core_lib_checkexpression_.additionalinfo.md).[promo](_core_lib_checkexpression_.additionalinfo.md#promo)*

Defined in @webresto/core/lib/checkExpression.ts:39

___

###  seoDescription

• **seoDescription**: *string*

Defined in @webresto/core/models/Group.ts:233

___

###  seoKeywords

• **seoKeywords**: *string*

Defined in @webresto/core/models/Group.ts:234

___

###  seoText

• **seoText**: *string*

Defined in @webresto/core/models/Group.ts:235

___

###  seoTitle

• **seoTitle**: *string*

Defined in @webresto/core/models/Group.ts:236

___

###  slug

• **slug**: *string*

Defined in @webresto/core/models/Group.ts:241

___

###  tags

• **tags**: *object[]*

Defined in @webresto/core/models/Group.ts:227

___

###  visible

• **visible**: *boolean*

*Inherited from [AdditionalInfo](_core_lib_checkexpression_.additionalinfo.md).[visible](_core_lib_checkexpression_.additionalinfo.md#visible)*

Defined in @webresto/core/lib/checkExpression.ts:37

___

###  workTime

• **workTime**: *[Time](_core_modelshelp_cause_.time.md)[]*

*Inherited from [AdditionalInfo](_core_lib_checkexpression_.additionalinfo.md).[workTime](_core_lib_checkexpression_.additionalinfo.md#worktime)*

Defined in @webresto/core/lib/checkExpression.ts:38

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
