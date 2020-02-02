[@webresto/core - v0.7.0-rc1](../README.md) › [Globals](../globals.md) › ["core/lib/hookTools"](../modules/_core_lib_hooktools_.md) › [HookTools](_core_lib_hooktools_.hooktools.md)

# Class: HookTools

Provide tools for hooks. Has only static methods.

## Hierarchy

* **HookTools**

## Index

### Properties

* [policies](_core_lib_hooktools_.hooktools.md#static-private-policies)

### Methods

* [bindModels](_core_lib_hooktools_.hooktools.md#static-bindmodels)
* [bindPolicy](_core_lib_hooktools_.hooktools.md#static-private-bindpolicy)
* [bindRouter](_core_lib_hooktools_.hooktools.md#static-bindrouter)
* [checkConfig](_core_lib_hooktools_.hooktools.md#static-checkconfig)
* [loadPolicies](_core_lib_hooktools_.hooktools.md#static-loadpolicies)
* [waitForHooks](_core_lib_hooktools_.hooktools.md#static-waitforhooks)

## Properties

### `Static` `Private` policies

▪ **policies**: *any*

Defined in @webresto/core/lib/hookTools.ts:19

Policies array is one for all project. It not assigned with sails policies

## Methods

### `Static` bindModels

▸ **bindModels**(`folder`: string): *Promise‹void›*

Defined in @webresto/core/lib/hookTools.ts:25

Bind models from folder. Folder must be full path.

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`folder` | string | path to models  |

**Returns:** *Promise‹void›*

___

### `Static` `Private` bindPolicy

▸ **bindPolicy**(`path`: string, `action`: [Action](../modules/_core_lib_hooktools_.md#action)): *any[]*

Defined in @webresto/core/lib/hookTools.ts:112

**Parameters:**

Name | Type |
------ | ------ |
`path` | string |
`action` | [Action](../modules/_core_lib_hooktools_.md#action) |

**Returns:** *any[]*

___

### `Static` bindRouter

▸ **bindRouter**(`path`: string, `action`: [Action](../modules/_core_lib_hooktools_.md#action), `method?`: string): *void*

Defined in @webresto/core/lib/hookTools.ts:89

Bind function `action` to router `path` with method `method`. Use policies binding from this module.

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`path` | string | /path/to/bind |
`action` | [Action](../modules/_core_lib_hooktools_.md#action) | function with Action type |
`method?` | string | GET or POST ot etc.  |

**Returns:** *void*

___

### `Static` checkConfig

▸ **checkConfig**(`key`: string): *boolean*

Defined in @webresto/core/lib/hookTools.ts:60

Check that config with name key exists in sails.config

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`key` | string | name of config to check |

**Returns:** *boolean*

true if config exists

___

### `Static` loadPolicies

▸ **loadPolicies**(`folder`: string): *void*

Defined in @webresto/core/lib/hookTools.ts:153

Load policies from given folder.
Folder must contain index.js file that contain object with {'path/to/': policyName}, where /path/to/ is router or '*'
and policyName is one of others file name.
For example
|
* - index.js > module.exports = {
|                '/index': 'policy'
|              }
|
* - policy.js > module.exports = function (req, res, next) {
                   return next();
                }

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`folder` | string | folder where policies load  |

**Returns:** *void*

___

### `Static` waitForHooks

▸ **waitForHooks**(`selfName`: string, `hooks`: string[], `cb`: function): *void*

Defined in @webresto/core/lib/hookTools.ts:70

Start cb function after given names of hooks. Call error with selfName if one of hooks not found

**Parameters:**

▪ **selfName**: *string*

name of hook. Uses for debugging

▪ **hooks**: *string[]*

array of names hooks to wait for

▪ **cb**: *function*

function

▸ (...`args`: any[]): *any*

**Parameters:**

Name | Type |
------ | ------ |
`...args` | any[] |

**Returns:** *void*
