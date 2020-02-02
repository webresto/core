[@webresto/core - v0.7.0-rc1](../README.md) › [Globals](../globals.md) › ["core/adapter/rms/RMSAdapter"](../modules/_core_adapter_rms_rmsadapter_.md) › [RMSAdapter](_core_adapter_rms_rmsadapter_.rmsadapter.md)

# Class: RMSAdapter

Абстрактный класс RMS адаптера. Используется для создания новых адаптеров RMS.

## Hierarchy

* **RMSAdapter**

## Index

### Constructors

* [constructor](_core_adapter_rms_rmsadapter_.rmsadapter.md#protected-constructor)

### Properties

* [syncBalanceTime](_core_adapter_rms_rmsadapter_.rmsadapter.md#protected-syncbalancetime)
* [syncMenuTime](_core_adapter_rms_rmsadapter_.rmsadapter.md#protected-syncmenutime)
* [syncStreetsTime](_core_adapter_rms_rmsadapter_.rmsadapter.md#protected-syncstreetstime)

### Methods

* [api](_core_adapter_rms_rmsadapter_.rmsadapter.md#abstract-api)
* [checkOrder](_core_adapter_rms_rmsadapter_.rmsadapter.md#abstract-checkorder)
* [createOrder](_core_adapter_rms_rmsadapter_.rmsadapter.md#abstract-createorder)
* [getSystemData](_core_adapter_rms_rmsadapter_.rmsadapter.md#abstract-getsystemdata)
* [sync](_core_adapter_rms_rmsadapter_.rmsadapter.md#protected-abstract-sync)
* [syncBalance](_core_adapter_rms_rmsadapter_.rmsadapter.md#protected-abstract-syncbalance)
* [syncStreets](_core_adapter_rms_rmsadapter_.rmsadapter.md#protected-abstract-syncstreets)
* [getInstance](_core_adapter_rms_rmsadapter_.rmsadapter.md#static-getinstance)

## Constructors

### `Protected` constructor

\+ **new RMSAdapter**(`menuTime`: number, `balanceTime`: number, `streetsTime`: number): *[RMSAdapter](_core_adapter_rms_rmsadapter_.rmsadapter.md)*

Defined in @webresto/core/adapter/rms/RMSAdapter.ts:10

**Parameters:**

Name | Type |
------ | ------ |
`menuTime` | number |
`balanceTime` | number |
`streetsTime` | number |

**Returns:** *[RMSAdapter](_core_adapter_rms_rmsadapter_.rmsadapter.md)*

## Properties

### `Protected` syncBalanceTime

• **syncBalanceTime**: *number*

Defined in @webresto/core/adapter/rms/RMSAdapter.ts:9

___

### `Protected` syncMenuTime

• **syncMenuTime**: *number*

Defined in @webresto/core/adapter/rms/RMSAdapter.ts:8

___

### `Protected` syncStreetsTime

• **syncStreetsTime**: *number*

Defined in @webresto/core/adapter/rms/RMSAdapter.ts:10

## Methods

### `Abstract` api

▸ **api**(`method`: string, `params`: any): *Promise‹any›*

Defined in @webresto/core/adapter/rms/RMSAdapter.ts:59

Прямой запрос к API RMS

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`method` | string | к какому методу обращаться |
`params` | any | какие параметры передавать |

**Returns:** *Promise‹any›*

ответ API

___

### `Abstract` checkOrder

▸ **checkOrder**(`orderData`: [Cart](../interfaces/_core_models_cart_.cart.md)): *Promise‹[OrderResponse](../interfaces/_core_adapter_rms_orderresponse_.orderresponse.md)›*

Defined in @webresto/core/adapter/rms/RMSAdapter.ts:45

Проверка заказа

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`orderData` | [Cart](../interfaces/_core_models_cart_.cart.md) | корзина для проверки |

**Returns:** *Promise‹[OrderResponse](../interfaces/_core_adapter_rms_orderresponse_.orderresponse.md)›*

результат работы функции, тело ответа и код результата

___

### `Abstract` createOrder

▸ **createOrder**(`orderData`: [Cart](../interfaces/_core_models_cart_.cart.md)): *Promise‹[OrderResponse](../interfaces/_core_adapter_rms_orderresponse_.orderresponse.md)›*

Defined in @webresto/core/adapter/rms/RMSAdapter.ts:38

Создание заказа

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`orderData` | [Cart](../interfaces/_core_models_cart_.cart.md) | корзина, которую заказывают |

**Returns:** *Promise‹[OrderResponse](../interfaces/_core_adapter_rms_orderresponse_.orderresponse.md)›*

Результат работы функции, тело ответа и код результата

___

### `Abstract` getSystemData

▸ **getSystemData**(): *Promise‹any›*

Defined in @webresto/core/adapter/rms/RMSAdapter.ts:51

Получение системной информации

**Returns:** *Promise‹any›*

системная информация RMS

___

### `Protected` `Abstract` sync

▸ **sync**(): *Promise‹void›*

Defined in @webresto/core/adapter/rms/RMSAdapter.ts:21

Синхронизация данных с RMS системы

**Returns:** *Promise‹void›*

___

### `Protected` `Abstract` syncBalance

▸ **syncBalance**(): *Promise‹void›*

Defined in @webresto/core/adapter/rms/RMSAdapter.ts:31

Синхронизация баланса блюд с RMS адаптера

**Returns:** *Promise‹void›*

___

### `Protected` `Abstract` syncStreets

▸ **syncStreets**(): *Promise‹void›*

Defined in @webresto/core/adapter/rms/RMSAdapter.ts:26

Синхронизация улиц с RMS системы

**Returns:** *Promise‹void›*

___

### `Static` getInstance

▸ **getInstance**(...`params`: any[]): *[RMSAdapter](_core_adapter_rms_rmsadapter_.rmsadapter.md)*

Defined in @webresto/core/adapter/rms/RMSAdapter.ts:65

Метод для создания и получения уже существующего RMS адаптера

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`...params` | any[] | параметры для инициализации  |

**Returns:** *[RMSAdapter](_core_adapter_rms_rmsadapter_.rmsadapter.md)*
