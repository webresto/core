[@webresto/core - v0.7.0-rc1](../README.md) › [Globals](../globals.md) › ["core/lib/globalTypes"](../modules/_core_lib_globaltypes_.md) › [__global](../modules/_core_lib_globaltypes_.__global.md) › [SailsConfig](_core_lib_globaltypes_.__global.sailsconfig.md)

# Interface: SailsConfig

## Hierarchy

* object

  ↳ **SailsConfig**

## Index

### Properties

* [csrf](_core_lib_globaltypes_.__global.sailsconfig.md#csrf)
* [environment](_core_lib_globaltypes_.__global.sailsconfig.md#environment)
* [explicitHost](_core_lib_globaltypes_.__global.sailsconfig.md#optional-explicithost)
* [globals](_core_lib_globaltypes_.__global.sailsconfig.md#globals)
* [hookTimeout](_core_lib_globaltypes_.__global.sailsconfig.md#hooktimeout)
* [http](_core_lib_globaltypes_.__global.sailsconfig.md#http)
* [i18n](_core_lib_globaltypes_.__global.sailsconfig.md#i18n)
* [keepResponseErrors](_core_lib_globaltypes_.__global.sailsconfig.md#keepresponseerrors)
* [log](_core_lib_globaltypes_.__global.sailsconfig.md#log)
* [models](_core_lib_globaltypes_.__global.sailsconfig.md#models)
* [port](_core_lib_globaltypes_.__global.sailsconfig.md#port)
* [proxyHost](_core_lib_globaltypes_.__global.sailsconfig.md#optional-proxyhost)
* [proxyPort](_core_lib_globaltypes_.__global.sailsconfig.md#optional-proxyport)
* [restocore](_core_lib_globaltypes_.__global.sailsconfig.md#restocore)
* [session](_core_lib_globaltypes_.__global.sailsconfig.md#session)
* [sockets](_core_lib_globaltypes_.__global.sailsconfig.md#sockets)
* [ssl](_core_lib_globaltypes_.__global.sailsconfig.md#ssl)
* [views](_core_lib_globaltypes_.__global.sailsconfig.md#views)

### Methods

* [bootstrap](_core_lib_globaltypes_.__global.sailsconfig.md#bootstrap)

## Properties

###  csrf

• **csrf**: *CSRF*

*Inherited from [__type](../modules/_core_lib_globaltypes_.md#__type).[csrf](../modules/_core_lib_globaltypes_.md#csrf)*

Defined in typed-sails/index.d.ts:29

___

###  environment

• **environment**: *string*

*Inherited from [__type](../modules/_core_lib_globaltypes_.md#__type).[environment](../modules/_core_lib_globaltypes_.md#environment)*

Defined in typed-sails/index.d.ts:24

___

### `Optional` explicitHost

• **explicitHost**? : *string*

*Inherited from [__type](../modules/_core_lib_globaltypes_.md#__type).[explicitHost](../modules/_core_lib_globaltypes_.md#optional-explicithost)*

Defined in typed-sails/index.d.ts:20

___

###  globals

• **globals**: *Globals | boolean*

*Inherited from [__type](../modules/_core_lib_globaltypes_.md#__type).[globals](../modules/_core_lib_globaltypes_.md#globals)*

Defined in typed-sails/index.d.ts:30

___

###  hookTimeout

• **hookTimeout**: *number*

*Inherited from [__type](../modules/_core_lib_globaltypes_.md#__type).[hookTimeout](../modules/_core_lib_globaltypes_.md#hooktimeout)*

Defined in typed-sails/index.d.ts:25

___

###  http

• **http**: *HTTP*

*Inherited from [__type](../modules/_core_lib_globaltypes_.md#__type).[http](../modules/_core_lib_globaltypes_.md#http)*

Defined in typed-sails/index.d.ts:31

___

###  i18n

• **i18n**: *i18n*

*Inherited from [__type](../modules/_core_lib_globaltypes_.md#__type).[i18n](../modules/_core_lib_globaltypes_.md#i18n)*

Defined in typed-sails/index.d.ts:32

___

###  keepResponseErrors

• **keepResponseErrors**: *boolean*

*Inherited from [__type](../modules/_core_lib_globaltypes_.md#__type).[keepResponseErrors](../modules/_core_lib_globaltypes_.md#keepresponseerrors)*

Defined in typed-sails/index.d.ts:26

___

###  log

• **log**: *Log*

*Inherited from [__type](../modules/_core_lib_globaltypes_.md#__type).[log](../modules/_core_lib_globaltypes_.md#log)*

Defined in typed-sails/index.d.ts:33

___

###  models

• **models**: *Models*

*Inherited from [__type](../modules/_core_lib_globaltypes_.md#__type).[models](../modules/_core_lib_globaltypes_.md#models)*

Defined in typed-sails/index.d.ts:34

___

###  port

• **port**: *number*

*Inherited from [__type](../modules/_core_lib_globaltypes_.md#__type).[port](../modules/_core_lib_globaltypes_.md#port)*

Defined in typed-sails/index.d.ts:23

___

### `Optional` proxyHost

• **proxyHost**? : *string*

*Inherited from [__type](../modules/_core_lib_globaltypes_.md#__type).[proxyHost](../modules/_core_lib_globaltypes_.md#optional-proxyhost)*

Defined in typed-sails/index.d.ts:21

___

### `Optional` proxyPort

• **proxyPort**? : *number*

*Inherited from [__type](../modules/_core_lib_globaltypes_.md#__type).[proxyPort](../modules/_core_lib_globaltypes_.md#optional-proxyport)*

Defined in typed-sails/index.d.ts:22

___

###  restocore

• **restocore**: *[Config](_core_modelshelp_config_.config.md)*

Defined in @webresto/core/lib/globalTypes.ts:17

___

###  session

• **session**: *Session*

*Inherited from [__type](../modules/_core_lib_globaltypes_.md#__type).[session](../modules/_core_lib_globaltypes_.md#session)*

Defined in typed-sails/index.d.ts:35

___

###  sockets

• **sockets**: *Sockets*

*Inherited from [__type](../modules/_core_lib_globaltypes_.md#__type).[sockets](../modules/_core_lib_globaltypes_.md#sockets)*

Defined in typed-sails/index.d.ts:36

___

###  ssl

• **ssl**: *boolean | object | object*

*Inherited from [__type](../modules/_core_lib_globaltypes_.md#__type).[ssl](../modules/_core_lib_globaltypes_.md#ssl)*

Defined in typed-sails/index.d.ts:27

___

###  views

• **views**: *Views*

*Inherited from [__type](../modules/_core_lib_globaltypes_.md#__type).[views](../modules/_core_lib_globaltypes_.md#views)*

Defined in typed-sails/index.d.ts:37

## Methods

###  bootstrap

▸ **bootstrap**(`cb`: Function): *void*

*Inherited from [__type](../modules/_core_lib_globaltypes_.md#__type).[bootstrap](../modules/_core_lib_globaltypes_.md#bootstrap)*

Defined in typed-sails/index.d.ts:28

**Parameters:**

Name | Type |
------ | ------ |
`cb` | Function |

**Returns:** *void*
