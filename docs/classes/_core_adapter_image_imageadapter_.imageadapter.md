[@webresto/core - v0.7.0-rc1](../README.md) › [Globals](../globals.md) › ["core/adapter/image/ImageAdapter"](../modules/_core_adapter_image_imageadapter_.md) › [ImageAdapter](_core_adapter_image_imageadapter_.imageadapter.md)

# Class: ImageAdapter

## Hierarchy

* **ImageAdapter**

## Index

### Constructors

* [constructor](_core_adapter_image_imageadapter_.imageadapter.md#protected-constructor)

### Properties

* [config](_core_adapter_image_imageadapter_.imageadapter.md#protected-config)

### Methods

* [load](_core_adapter_image_imageadapter_.imageadapter.md#abstract-load)

## Constructors

### `Protected` constructor

\+ **new ImageAdapter**(`config`: [ImageConfig](../interfaces/_core_adapter_image_imageconfig_.imageconfig.md)): *[ImageAdapter](_core_adapter_image_imageadapter_.imageadapter.md)*

Defined in @webresto/core/adapter/image/ImageAdapter.ts:4

**Parameters:**

Name | Type |
------ | ------ |
`config` | [ImageConfig](../interfaces/_core_adapter_image_imageconfig_.imageconfig.md) |

**Returns:** *[ImageAdapter](_core_adapter_image_imageadapter_.imageadapter.md)*

## Properties

### `Protected` config

• **config**: *[ImageConfig](../interfaces/_core_adapter_image_imageconfig_.imageconfig.md)*

Defined in @webresto/core/adapter/image/ImageAdapter.ts:4

## Methods

### `Abstract` load

▸ **load**(`url`: string, `key`: "dish" | "group"): *Promise‹object›*

Defined in @webresto/core/adapter/image/ImageAdapter.ts:14

**Parameters:**

Name | Type |
------ | ------ |
`url` | string |
`key` | "dish" &#124; "group" |

**Returns:** *Promise‹object›*
