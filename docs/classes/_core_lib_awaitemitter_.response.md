[@webresto/core - v0.7.0-rc1](../README.md) › [Globals](../globals.md) › ["core/lib/AwaitEmitter"](../modules/_core_lib_awaitemitter_.md) › [Response](_core_lib_awaitemitter_.response.md)

# Class: Response

Объект ответа, содержит пометку откуда был слушатель, состояние результат (успех, ошибка, таймаут) и результат или
ошибку, которые вернула или вызвала функция

## Hierarchy

* **Response**

## Index

### Constructors

* [constructor](_core_lib_awaitemitter_.response.md#constructor)

### Properties

* [error](_core_lib_awaitemitter_.response.md#error)
* [label](_core_lib_awaitemitter_.response.md#label)
* [result](_core_lib_awaitemitter_.response.md#result)
* [state](_core_lib_awaitemitter_.response.md#state)

## Constructors

###  constructor

\+ **new Response**(`label`: string, `result`: any, `error?`: any, `timeout?`: boolean): *[Response](_core_lib_awaitemitter_.response.md)*

Defined in @webresto/core/lib/AwaitEmitter.ts:146

**Parameters:**

Name | Type |
------ | ------ |
`label` | string |
`result` | any |
`error?` | any |
`timeout?` | boolean |

**Returns:** *[Response](_core_lib_awaitemitter_.response.md)*

## Properties

###  error

• **error**: *any*

Defined in @webresto/core/lib/AwaitEmitter.ts:146

___

###  label

• **label**: *string*

Defined in @webresto/core/lib/AwaitEmitter.ts:143

___

###  result

• **result**: *any*

Defined in @webresto/core/lib/AwaitEmitter.ts:145

___

###  state

• **state**: *"success" | "error" | "timeout"*

Defined in @webresto/core/lib/AwaitEmitter.ts:144
