[@webresto/core - v0.7.0-rc1](../README.md) › [Globals](../globals.md) › ["core/lib/AwaitEmitter"](_core_lib_awaitemitter_.md)

# External module: "core/lib/AwaitEmitter"

## Index

### Classes

* [AwaitEmitter](../classes/_core_lib_awaitemitter_.awaitemitter.md)
* [Event](../classes/_core_lib_awaitemitter_.event.md)
* [Response](../classes/_core_lib_awaitemitter_.response.md)

### Type aliases

* [func](_core_lib_awaitemitter_.md#func)

### Variables

* [isPromise](_core_lib_awaitemitter_.md#const-ispromise)
* [sleep](_core_lib_awaitemitter_.md#const-sleep)

## Type aliases

###  func

Ƭ **func**: *function*

Defined in @webresto/core/lib/AwaitEmitter.ts:4

#### Type declaration:

▸ (...`args`: any): *any | Promise‹any›*

**Parameters:**

Name | Type |
------ | ------ |
`...args` | any |

## Variables

### `Const` isPromise

• **isPromise**: *any* =  require('is-promise')

Defined in @webresto/core/lib/AwaitEmitter.ts:1

___

### `Const` sleep

• **sleep**: *any* =  require('util').promisify(setTimeout)

Defined in @webresto/core/lib/AwaitEmitter.ts:2
