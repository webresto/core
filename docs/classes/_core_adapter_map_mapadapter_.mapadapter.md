[@webresto/core - v0.7.0-rc1](../README.md) › [Globals](../globals.md) › ["core/adapter/map/MapAdapter"](../modules/_core_adapter_map_mapadapter_.md) › [MapAdapter](_core_adapter_map_mapadapter_.mapadapter.md)

# Class: MapAdapter

## Hierarchy

* **MapAdapter**

## Index

### Constructors

* [constructor](_core_adapter_map_mapadapter_.mapadapter.md#protected-constructor)

### Properties

* [config](_core_adapter_map_mapadapter_.mapadapter.md#protected-config)

### Methods

* [checkDotInPolygon](_core_adapter_map_mapadapter_.mapadapter.md#abstract-checkdotinpolygon)
* [getDistance](_core_adapter_map_mapadapter_.mapadapter.md#abstract-getdistance)
* [getGeocode](_core_adapter_map_mapadapter_.mapadapter.md#abstract-getgeocode)
* [getPolygons](_core_adapter_map_mapadapter_.mapadapter.md#abstract-getpolygons)

## Constructors

### `Protected` constructor

\+ **new MapAdapter**(`config`: [MapConfig](../interfaces/_core_adapter_map_mapconfig_.mapconfig.md)): *[MapAdapter](_core_adapter_map_mapadapter_.mapadapter.md)*

Defined in @webresto/core/adapter/map/MapAdapter.ts:6

**Parameters:**

Name | Type |
------ | ------ |
`config` | [MapConfig](../interfaces/_core_adapter_map_mapconfig_.mapconfig.md) |

**Returns:** *[MapAdapter](_core_adapter_map_mapadapter_.mapadapter.md)*

## Properties

### `Protected` config

• **config**: *[MapConfig](../interfaces/_core_adapter_map_mapconfig_.mapconfig.md)*

Defined in @webresto/core/adapter/map/MapAdapter.ts:6

## Methods

### `Abstract` checkDotInPolygon

▸ **checkDotInPolygon**(`dot`: [Point](_core_adapter_map_point_.point.md), `polygon`: [Polygon](_core_adapter_map_polygon_.polygon.md)): *boolean*

Defined in @webresto/core/adapter/map/MapAdapter.ts:16

**Parameters:**

Name | Type |
------ | ------ |
`dot` | [Point](_core_adapter_map_point_.point.md) |
`polygon` | [Polygon](_core_adapter_map_polygon_.polygon.md) |

**Returns:** *boolean*

___

### `Abstract` getDistance

▸ **getDistance**(`dot1`: [Point](_core_adapter_map_point_.point.md), `dot2`: [Point](_core_adapter_map_point_.point.md)): *number*

Defined in @webresto/core/adapter/map/MapAdapter.ts:18

**Parameters:**

Name | Type |
------ | ------ |
`dot1` | [Point](_core_adapter_map_point_.point.md) |
`dot2` | [Point](_core_adapter_map_point_.point.md) |

**Returns:** *number*

___

### `Abstract` getGeocode

▸ **getGeocode**(`street`: string, `home`: number): *Promise‹[Point](_core_adapter_map_point_.point.md)›*

Defined in @webresto/core/adapter/map/MapAdapter.ts:12

**Parameters:**

Name | Type |
------ | ------ |
`street` | string |
`home` | number |

**Returns:** *Promise‹[Point](_core_adapter_map_point_.point.md)›*

___

### `Abstract` getPolygons

▸ **getPolygons**(): *Promise‹[Polygon](_core_adapter_map_polygon_.polygon.md)[]›*

Defined in @webresto/core/adapter/map/MapAdapter.ts:14

**Returns:** *Promise‹[Polygon](_core_adapter_map_polygon_.polygon.md)[]›*
