[@webresto/core - v0.7.0-rc1](../README.md) › [Globals](../globals.md) › ["core/lib/initialize"](_core_lib_initialize_.md)

# External module: "core/lib/initialize"

## Index

### Variables

* [State](_core_lib_initialize_.md#const-state)

### Functions

* [ToInitialize](_core_lib_initialize_.md#toinitialize)

## Variables

### `Const` State

• **State**: *any* =  require('sails-hook-stateflow').State

Defined in @webresto/core/lib/initialize.ts:12

## Functions

###  ToInitialize

▸ **ToInitialize**(`sails`: any): *initialize*

Defined in @webresto/core/lib/initialize.ts:20

Initialize hook. If sails.config.restocore not exists hook will not be loaded.
Bind models.

**`constructor`** 

**Parameters:**

Name | Type |
------ | ------ |
`sails` | any |

**Returns:** *initialize*
