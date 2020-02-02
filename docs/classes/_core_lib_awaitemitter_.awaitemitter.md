[@webresto/core - v0.7.0-rc1](../README.md) › [Globals](../globals.md) › ["core/lib/AwaitEmitter"](../modules/_core_lib_awaitemitter_.md) › [AwaitEmitter](_core_lib_awaitemitter_.awaitemitter.md)

# Class: AwaitEmitter

Класс, позволяющий создавать события и ожидать исполнения их подписок, будь то синхронная функция или функция, возвращающая
Promise. В момент выполнения события запускает все подписки на исполнение, запоминая результат работы каждой (успешный,
с ошибкой или время ожидания вышло).

## Hierarchy

* **AwaitEmitter**

## Index

### Constructors

* [constructor](_core_lib_awaitemitter_.awaitemitter.md#constructor)

### Properties

* [events](_core_lib_awaitemitter_.awaitemitter.md#events)
* [name](_core_lib_awaitemitter_.awaitemitter.md#name)
* [timeout](_core_lib_awaitemitter_.awaitemitter.md#timeout)

### Methods

* [emit](_core_lib_awaitemitter_.awaitemitter.md#emit)
* [on](_core_lib_awaitemitter_.awaitemitter.md#on)

## Constructors

###  constructor

\+ **new AwaitEmitter**(`name`: string, `timeout?`: number): *[AwaitEmitter](_core_lib_awaitemitter_.awaitemitter.md)*

Defined in @webresto/core/lib/AwaitEmitter.ts:14

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`name` | string | название нового эмиттера |
`timeout?` | number | указывает сколько милисекунд ожидать функции, которые возвращают Promise.  |

**Returns:** *[AwaitEmitter](_core_lib_awaitemitter_.awaitemitter.md)*

## Properties

###  events

• **events**: *[Event](_core_lib_awaitemitter_.event.md)[]*

Defined in @webresto/core/lib/AwaitEmitter.ts:12

___

###  name

• **name**: *string*

Defined in @webresto/core/lib/AwaitEmitter.ts:13

___

###  timeout

• **timeout**: *number*

Defined in @webresto/core/lib/AwaitEmitter.ts:14

## Methods

###  emit

▸ **emit**(`name`: string, ...`args`: any): *Promise‹[Response](_core_lib_awaitemitter_.response.md)[]›*

Defined in @webresto/core/lib/AwaitEmitter.ts:67

Эмиттит событие с названием name иаргументами args. Если функция подписчик отдаёт не Promise, то она считается синхронной
и выполняется сразу же, если же функция слушатель возвращает Promise, то она вместе с остальными такими же слушателями
выполняется параллельно, при этом может быть превышено время ожидание. Если слушатель при этом выполнится после
превышения времени ожидания, то будет выведенно соответствующее сообщение

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`name` | string | название события |
`...args` | any | аргументы |

**Returns:** *Promise‹[Response](_core_lib_awaitemitter_.response.md)[]›*

Массив объектов Response

___

###  on

▸ **on**(`name`: string, `fn`: [func](../modules/_core_lib_awaitemitter_.md#func)): *[AwaitEmitter](_core_lib_awaitemitter_.awaitemitter.md)*

Defined in @webresto/core/lib/AwaitEmitter.ts:31

Подписка на событие

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`name` | string | название события |
`fn` | [func](../modules/_core_lib_awaitemitter_.md#func) | функция подписчик  |

**Returns:** *[AwaitEmitter](_core_lib_awaitemitter_.awaitemitter.md)*

▸ **on**(`name`: string, `label`: string, `fn`: [func](../modules/_core_lib_awaitemitter_.md#func)): *[AwaitEmitter](_core_lib_awaitemitter_.awaitemitter.md)*

Defined in @webresto/core/lib/AwaitEmitter.ts:38

Подписка на событие

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`name` | string | название события |
`label` | string | метка подписчика (используется для отладки) |
`fn` | [func](../modules/_core_lib_awaitemitter_.md#func) | функция подписчика  |

**Returns:** *[AwaitEmitter](_core_lib_awaitemitter_.awaitemitter.md)*
