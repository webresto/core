[@webresto/core - v0.7.0-rc1](../README.md) › [Globals](../globals.md) › ["core/modelsHelp/Config"](../modules/_core_modelshelp_config_.md) › [Config](_core_modelshelp_config_.config.md)

# Interface: Config

## Hierarchy

* **Config**

## Index

### Properties

* [awaitEmitterTimeout](_core_modelshelp_config_.config.md#optional-awaitemittertimeout)
* [check](_core_modelshelp_config_.config.md#check)
* [checkType](_core_modelshelp_config_.config.md#checktype)
* [city](_core_modelshelp_config_.config.md#city)
* [comment](_core_modelshelp_config_.config.md#optional-comment)
* [deliveryWorkTime](_core_modelshelp_config_.config.md#deliveryworktime)
* [email](_core_modelshelp_config_.config.md#optional-email)
* [groupShift](_core_modelshelp_config_.config.md#groupshift)
* [images](_core_modelshelp_config_.config.md#images)
* [map](_core_modelshelp_config_.config.md#map)
* [nameRegex](_core_modelshelp_config_.config.md#optional-nameregex)
* [notInZone](_core_modelshelp_config_.config.md#notinzone)
* [order](_core_modelshelp_config_.config.md#order)
* [orderFail](_core_modelshelp_config_.config.md#orderfail)
* [phoneRegex](_core_modelshelp_config_.config.md#optional-phoneregex)
* [prefix](_core_modelshelp_config_.config.md#prefix)
* [rmsAdapter](_core_modelshelp_config_.config.md#rmsadapter)
* [timeSyncBalance](_core_modelshelp_config_.config.md#timesyncbalance)
* [timeSyncMap](_core_modelshelp_config_.config.md#timesyncmap)
* [timeSyncMenu](_core_modelshelp_config_.config.md#timesyncmenu)
* [timeSyncStreets](_core_modelshelp_config_.config.md#timesyncstreets)
* [timezone](_core_modelshelp_config_.config.md#timezone)
* [zoneDontWork](_core_modelshelp_config_.config.md#optional-zonedontwork)
* [zoneNotFound](_core_modelshelp_config_.config.md#optional-zonenotfound)

## Properties

### `Optional` awaitEmitterTimeout

• **awaitEmitterTimeout**? : *number*

Defined in @webresto/core/modelsHelp/Config.ts:90

___

###  check

• **check**: *object*

Defined in @webresto/core/modelsHelp/Config.ts:78

#### Type declaration:

* **notRequired**: *boolean*

* **requireAll**: *boolean*

___

###  checkType

• **checkType**: *string*

Defined in @webresto/core/modelsHelp/Config.ts:71

___

###  city

• **city**: *string*

Defined in @webresto/core/modelsHelp/Config.ts:51

___

### `Optional` comment

• **comment**? : *string*

Defined in @webresto/core/modelsHelp/Config.ts:87

___

###  deliveryWorkTime

• **deliveryWorkTime**: *[Time](_core_modelshelp_cause_.time.md)[]*

Defined in @webresto/core/modelsHelp/Config.ts:73

___

### `Optional` email

• **email**? : *object*

Defined in @webresto/core/modelsHelp/Config.ts:52

#### Type declaration:

* **server**(): *object*

  * **host**: *string*

  * **password**: *string*

  * **ssl**: *boolean*

  * **user**: *string*

* **template**: *string*

___

###  groupShift

• **groupShift**: *string*

Defined in @webresto/core/modelsHelp/Config.ts:74

___

###  images

• **images**: *[ImageConfig](_core_adapter_image_imageconfig_.imageconfig.md)*

Defined in @webresto/core/modelsHelp/Config.ts:50

___

###  map

• **map**: *object*

Defined in @webresto/core/modelsHelp/Config.ts:62

#### Type declaration:

* **api**: *string*

* **check**: *string*

* **customMap**: *string*

* **customMaps**: *string*

* **distance**: *string*

* **geocode**: *string*

___

### `Optional` nameRegex

• **nameRegex**? : *string*

Defined in @webresto/core/modelsHelp/Config.ts:77

___

###  notInZone

• **notInZone**: *string*

Defined in @webresto/core/modelsHelp/Config.ts:89

___

###  order

• **order**: *object*

Defined in @webresto/core/modelsHelp/Config.ts:82

#### Type declaration:

* **notRequired**: *boolean*

* **requireAll**: *boolean*

___

###  orderFail

• **orderFail**: *string*

Defined in @webresto/core/modelsHelp/Config.ts:88

___

### `Optional` phoneRegex

• **phoneRegex**? : *string*

Defined in @webresto/core/modelsHelp/Config.ts:76

___

###  prefix

• **prefix**: *string*

Defined in @webresto/core/modelsHelp/Config.ts:46

___

###  rmsAdapter

• **rmsAdapter**: *string*

Defined in @webresto/core/modelsHelp/Config.ts:75

___

###  timeSyncBalance

• **timeSyncBalance**: *number*

Defined in @webresto/core/modelsHelp/Config.ts:47

___

###  timeSyncMap

• **timeSyncMap**: *number*

Defined in @webresto/core/modelsHelp/Config.ts:70

___

###  timeSyncMenu

• **timeSyncMenu**: *number*

Defined in @webresto/core/modelsHelp/Config.ts:48

___

###  timeSyncStreets

• **timeSyncStreets**: *number*

Defined in @webresto/core/modelsHelp/Config.ts:49

___

###  timezone

• **timezone**: *string*

Defined in @webresto/core/modelsHelp/Config.ts:61

___

### `Optional` zoneDontWork

• **zoneDontWork**? : *string*

Defined in @webresto/core/modelsHelp/Config.ts:72

___

### `Optional` zoneNotFound

• **zoneNotFound**? : *string*

Defined in @webresto/core/modelsHelp/Config.ts:86
