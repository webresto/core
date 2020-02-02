[@webresto/core - v0.7.0-rc1](../README.md) › [Globals](../globals.md) › ["core/models/Group"](../modules/_core_models_group_.md) › [GroupWithAdditionalFields](_core_models_group_.groupwithadditionalfields.md)

# Interface: GroupWithAdditionalFields

Описывает группу блюд в момент получения её популяризированной версии, дополнительные поля являются ошибкой фреймворка

## Hierarchy

  ↳ [Group](_core_models_group_.group.md)

  ↳ **GroupWithAdditionalFields**

## Index

### Properties

* [additionalInfo](_core_models_group_.groupwithadditionalfields.md#additionalinfo)
* [childGroups](_core_models_group_.groupwithadditionalfields.md#childgroups)
* [children](_core_models_group_.groupwithadditionalfields.md#children)
* [code](_core_models_group_.groupwithadditionalfields.md#code)
* [description](_core_models_group_.groupwithadditionalfields.md#description)
* [dishes](_core_models_group_.groupwithadditionalfields.md#dishes)
* [dishesList](_core_models_group_.groupwithadditionalfields.md#disheslist)
* [dishesTags](_core_models_group_.groupwithadditionalfields.md#dishestags)
* [id](_core_models_group_.groupwithadditionalfields.md#id)
* [images](_core_models_group_.groupwithadditionalfields.md#images)
* [isDeleted](_core_models_group_.groupwithadditionalfields.md#isdeleted)
* [isIncludedInMenu](_core_models_group_.groupwithadditionalfields.md#isincludedinmenu)
* [modifier](_core_models_group_.groupwithadditionalfields.md#modifier)
* [name](_core_models_group_.groupwithadditionalfields.md#name)
* [order](_core_models_group_.groupwithadditionalfields.md#order)
* [parentGroup](_core_models_group_.groupwithadditionalfields.md#parentgroup)
* [promo](_core_models_group_.groupwithadditionalfields.md#promo)
* [seoDescription](_core_models_group_.groupwithadditionalfields.md#seodescription)
* [seoKeywords](_core_models_group_.groupwithadditionalfields.md#seokeywords)
* [seoText](_core_models_group_.groupwithadditionalfields.md#seotext)
* [seoTitle](_core_models_group_.groupwithadditionalfields.md#seotitle)
* [slug](_core_models_group_.groupwithadditionalfields.md#slug)
* [tags](_core_models_group_.groupwithadditionalfields.md#tags)
* [visible](_core_models_group_.groupwithadditionalfields.md#visible)
* [workTime](_core_models_group_.groupwithadditionalfields.md#worktime)

### Methods

* [add](_core_models_group_.groupwithadditionalfields.md#add)
* [destroy](_core_models_group_.groupwithadditionalfields.md#destroy)
* [remove](_core_models_group_.groupwithadditionalfields.md#remove)
* [save](_core_models_group_.groupwithadditionalfields.md#save)

## Properties

###  additionalInfo

• **additionalInfo**: *string*

*Inherited from [Group](_core_models_group_.group.md).[additionalInfo](_core_models_group_.group.md#additionalinfo)*

Defined in @webresto/core/models/Group.ts:223

___

###  childGroups

• **childGroups**: *[Group](_core_models_group_.group.md)[]*

*Inherited from [Group](_core_models_group_.group.md).[childGroups](_core_models_group_.group.md#childgroups)*

Defined in @webresto/core/models/Group.ts:224

___

###  children

• **children**: *[Group](_core_models_group_.group.md)[]*

Defined in @webresto/core/models/Group.ts:214

___

###  code

• **code**: *number*

*Inherited from [Group](_core_models_group_.group.md).[code](_core_models_group_.group.md#code)*

Defined in @webresto/core/models/Group.ts:231

___

###  description

• **description**: *string*

*Inherited from [Group](_core_models_group_.group.md).[description](_core_models_group_.group.md#description)*

Defined in @webresto/core/models/Group.ts:232

___

###  dishes

• **dishes**: *[Dish](_core_models_dish_.dish.md)[]*

*Inherited from [Group](_core_models_group_.group.md).[dishes](_core_models_group_.group.md#dishes)*

Defined in @webresto/core/models/Group.ts:240

___

###  dishesList

• **dishesList**: *[Dish](_core_models_dish_.dish.md)[]*

Defined in @webresto/core/models/Group.ts:215

___

###  dishesTags

• **dishesTags**: *object[]*

*Inherited from [Group](_core_models_group_.group.md).[dishesTags](_core_models_group_.group.md#dishestags)*

Defined in @webresto/core/models/Group.ts:239

___

###  id

• **id**: *string*

*Inherited from [Group](_core_models_group_.group.md).[id](_core_models_group_.group.md#id)*

Defined in @webresto/core/models/Group.ts:222

___

###  images

• **images**: *[Association](../modules/_core_lib_globaltypes_.__global.md#association)‹[Image](_core_models_image_.image.md)›*

*Inherited from [Group](_core_models_group_.group.md).[images](_core_models_group_.group.md#images)*

Defined in @webresto/core/models/Group.ts:228

___

###  isDeleted

• **isDeleted**: *boolean*

*Inherited from [Group](_core_models_group_.group.md).[isDeleted](_core_models_group_.group.md#isdeleted)*

Defined in @webresto/core/models/Group.ts:229

___

###  isIncludedInMenu

• **isIncludedInMenu**: *boolean*

*Inherited from [Group](_core_models_group_.group.md).[isIncludedInMenu](_core_models_group_.group.md#isincludedinmenu)*

Defined in @webresto/core/models/Group.ts:237

___

###  modifier

• **modifier**: *boolean*

*Inherited from [AdditionalInfo](_core_lib_checkexpression_.additionalinfo.md).[modifier](_core_lib_checkexpression_.additionalinfo.md#modifier)*

Defined in @webresto/core/lib/checkExpression.ts:40

___

###  name

• **name**: *string*

*Inherited from [Group](_core_models_group_.group.md).[name](_core_models_group_.group.md#name)*

Defined in @webresto/core/models/Group.ts:226

___

###  order

• **order**: *number*

*Inherited from [Group](_core_models_group_.group.md).[order](_core_models_group_.group.md#order)*

Defined in @webresto/core/models/Group.ts:238

___

###  parentGroup

• **parentGroup**: *[Group](_core_models_group_.group.md)*

*Inherited from [Group](_core_models_group_.group.md).[parentGroup](_core_models_group_.group.md#parentgroup)*

Defined in @webresto/core/models/Group.ts:225

___

###  promo

• **promo**: *boolean*

*Inherited from [AdditionalInfo](_core_lib_checkexpression_.additionalinfo.md).[promo](_core_lib_checkexpression_.additionalinfo.md#promo)*

Defined in @webresto/core/lib/checkExpression.ts:39

___

###  seoDescription

• **seoDescription**: *string*

*Inherited from [Group](_core_models_group_.group.md).[seoDescription](_core_models_group_.group.md#seodescription)*

Defined in @webresto/core/models/Group.ts:233

___

###  seoKeywords

• **seoKeywords**: *string*

*Inherited from [Group](_core_models_group_.group.md).[seoKeywords](_core_models_group_.group.md#seokeywords)*

Defined in @webresto/core/models/Group.ts:234

___

###  seoText

• **seoText**: *string*

*Inherited from [Group](_core_models_group_.group.md).[seoText](_core_models_group_.group.md#seotext)*

Defined in @webresto/core/models/Group.ts:235

___

###  seoTitle

• **seoTitle**: *string*

*Inherited from [Group](_core_models_group_.group.md).[seoTitle](_core_models_group_.group.md#seotitle)*

Defined in @webresto/core/models/Group.ts:236

___

###  slug

• **slug**: *string*

*Inherited from [Group](_core_models_group_.group.md).[slug](_core_models_group_.group.md#slug)*

Defined in @webresto/core/models/Group.ts:241

___

###  tags

• **tags**: *object[]*

*Inherited from [Group](_core_models_group_.group.md).[tags](_core_models_group_.group.md#tags)*

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
