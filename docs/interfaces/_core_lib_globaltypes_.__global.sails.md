[@webresto/core - v0.7.0-rc1](../README.md) › [Globals](../globals.md) › ["core/lib/globalTypes"](../modules/_core_lib_globaltypes_.md) › [__global](../modules/_core_lib_globaltypes_.__global.md) › [Sails](_core_lib_globaltypes_.__global.sails.md)

# Interface: Sails

## Hierarchy

* Sails

  ↳ **Sails**

## Index

### Properties

* [config](_core_lib_globaltypes_.__global.sails.md#config)
* [hooks](_core_lib_globaltypes_.__global.sails.md#hooks)
* [iikoFail](_core_lib_globaltypes_.__global.sails.md#iikofail)
* [log](_core_lib_globaltypes_.__global.sails.md#log)
* [models](_core_lib_globaltypes_.__global.sails.md#models)
* [router](_core_lib_globaltypes_.__global.sails.md#router)
* [sockets](_core_lib_globaltypes_.__global.sails.md#sockets)
* [defaultMaxListeners](_core_lib_globaltypes_.__global.sails.md#static-defaultmaxlisteners)

### Methods

* [addListener](_core_lib_globaltypes_.__global.sails.md#addlistener)
* [after](_core_lib_globaltypes_.__global.sails.md#after)
* [constructor](_core_lib_globaltypes_.__global.sails.md#constructor)
* [emit](_core_lib_globaltypes_.__global.sails.md#emit)
* [eventNames](_core_lib_globaltypes_.__global.sails.md#eventnames)
* [getBaseUrl](_core_lib_globaltypes_.__global.sails.md#getbaseurl)
* [getMaxListeners](_core_lib_globaltypes_.__global.sails.md#getmaxlisteners)
* [getRouteFor](_core_lib_globaltypes_.__global.sails.md#getroutefor)
* [getUrlFor](_core_lib_globaltypes_.__global.sails.md#geturlfor)
* [lift](_core_lib_globaltypes_.__global.sails.md#lift)
* [listenerCount](_core_lib_globaltypes_.__global.sails.md#listenercount)
* [listeners](_core_lib_globaltypes_.__global.sails.md#listeners)
* [load](_core_lib_globaltypes_.__global.sails.md#load)
* [lower](_core_lib_globaltypes_.__global.sails.md#lower)
* [off](_core_lib_globaltypes_.__global.sails.md#off)
* [on](_core_lib_globaltypes_.__global.sails.md#on)
* [once](_core_lib_globaltypes_.__global.sails.md#once)
* [prependListener](_core_lib_globaltypes_.__global.sails.md#prependlistener)
* [prependOnceListener](_core_lib_globaltypes_.__global.sails.md#prependoncelistener)
* [rawListeners](_core_lib_globaltypes_.__global.sails.md#rawlisteners)
* [removeAllListeners](_core_lib_globaltypes_.__global.sails.md#removealllisteners)
* [removeListener](_core_lib_globaltypes_.__global.sails.md#removelistener)
* [request](_core_lib_globaltypes_.__global.sails.md#request)
* [setMaxListeners](_core_lib_globaltypes_.__global.sails.md#setmaxlisteners)
* [listenerCount](_core_lib_globaltypes_.__global.sails.md#static-listenercount)

## Properties

###  config

• **config**: *[SailsConfig](_core_lib_globaltypes_.__global.sailsconfig.md)*

*Overrides void*

Defined in @webresto/core/lib/globalTypes.ts:13

___

###  hooks

• **hooks**: *any & object*

*Inherited from void*

Defined in typed-sails/index.d.ts:41

___

###  iikoFail

• **iikoFail**: *boolean*

Defined in @webresto/core/lib/globalTypes.ts:14

___

###  log

• **log**: *Logger*

*Inherited from void*

Defined in typed-sails/index.d.ts:17

___

###  models

• **models**: *any*

*Inherited from void*

Defined in typed-sails/index.d.ts:18

___

###  router

• **router**: *Router*

*Inherited from void*

Defined in typed-sails/index.d.ts:75

___

###  sockets

• **sockets**: *any*

*Inherited from void*

Defined in typed-sails/index.d.ts:39

___

### `Static` defaultMaxListeners

▪ **defaultMaxListeners**: *number*

*Inherited from void*

Defined in @types/node/events.d.ts:18

## Methods

###  addListener

▸ **addListener**(`event`: string | symbol, `listener`: function): *this*

*Inherited from void*

*Overrides void*

Defined in @types/node/events.d.ts:20

**Parameters:**

▪ **event**: *string | symbol*

▪ **listener**: *function*

▸ (...`args`: any[]): *void*

**Parameters:**

Name | Type |
------ | ------ |
`...args` | any[] |

**Returns:** *this*

___

###  after

▸ **after**(`event`: string, `listener`: Function): *this*

*Inherited from void*

Defined in typed-sails/index.d.ts:72

**Parameters:**

Name | Type |
------ | ------ |
`event` | string |
`listener` | Function |

**Returns:** *this*

▸ **after**(`event`: string[], `listener`: Function): *this*

*Inherited from void*

Defined in typed-sails/index.d.ts:73

**Parameters:**

Name | Type |
------ | ------ |
`event` | string[] |
`listener` | Function |

**Returns:** *this*

___

###  constructor

▸ **constructor**(`config?`: any): *void*

*Inherited from void*

Defined in typed-sails/index.d.ts:16

**Parameters:**

Name | Type |
------ | ------ |
`config?` | any |

**Returns:** *void*

___

###  emit

▸ **emit**(`event`: string | symbol, ...`args`: any[]): *boolean*

*Inherited from void*

*Overrides void*

Defined in @types/node/events.d.ts:32

**Parameters:**

Name | Type |
------ | ------ |
`event` | string &#124; symbol |
`...args` | any[] |

**Returns:** *boolean*

___

###  eventNames

▸ **eventNames**(): *Array‹string | symbol›*

*Inherited from void*

*Overrides void*

Defined in @types/node/events.d.ts:33

**Returns:** *Array‹string | symbol›*

___

###  getBaseUrl

▸ **getBaseUrl**(): *string*

*Inherited from void*

Defined in typed-sails/index.d.ts:69

**Returns:** *string*

___

###  getMaxListeners

▸ **getMaxListeners**(): *number*

*Inherited from void*

*Overrides void*

Defined in @types/node/events.d.ts:29

**Returns:** *number*

___

###  getRouteFor

▸ **getRouteFor**(`target`: string): *Route*

*Inherited from void*

Defined in typed-sails/index.d.ts:70

**Parameters:**

Name | Type |
------ | ------ |
`target` | string |

**Returns:** *Route*

___

###  getUrlFor

▸ **getUrlFor**(`target`: string): *string*

*Inherited from void*

Defined in typed-sails/index.d.ts:71

**Parameters:**

Name | Type |
------ | ------ |
`target` | string |

**Returns:** *string*

___

###  lift

▸ **lift**(`options?`: any, `cb?`: function): *void*

*Inherited from void*

Defined in typed-sails/index.d.ts:63

**Parameters:**

▪`Optional`  **options**: *any*

▪`Optional`  **cb**: *function*

▸ (`err`: Error, `sails`: Sails): *void*

**Parameters:**

Name | Type |
------ | ------ |
`err` | Error |
`sails` | Sails |

**Returns:** *void*

___

###  listenerCount

▸ **listenerCount**(`type`: string | symbol): *number*

*Inherited from void*

*Overrides void*

Defined in @types/node/events.d.ts:34

**Parameters:**

Name | Type |
------ | ------ |
`type` | string &#124; symbol |

**Returns:** *number*

___

###  listeners

▸ **listeners**(`event`: string | symbol): *Function[]*

*Inherited from void*

*Overrides void*

Defined in @types/node/events.d.ts:30

**Parameters:**

Name | Type |
------ | ------ |
`event` | string &#124; symbol |

**Returns:** *Function[]*

___

###  load

▸ **load**(`options?`: any, `cb?`: function): *void*

*Inherited from void*

Defined in typed-sails/index.d.ts:62

**Parameters:**

▪`Optional`  **options**: *any*

▪`Optional`  **cb**: *function*

▸ (`err`: Error, `sails`: Sails): *void*

**Parameters:**

Name | Type |
------ | ------ |
`err` | Error |
`sails` | Sails |

**Returns:** *void*

___

###  lower

▸ **lower**(`cb?`: function): *void*

*Inherited from void*

Defined in typed-sails/index.d.ts:64

**Parameters:**

▪`Optional`  **cb**: *function*

▸ (`err`: Error): *void*

**Parameters:**

Name | Type |
------ | ------ |
`err` | Error |

**Returns:** *void*

___

###  off

▸ **off**(`event`: string | symbol, `listener`: function): *this*

*Inherited from void*

*Overrides void*

Defined in @types/node/events.d.ts:26

**Parameters:**

▪ **event**: *string | symbol*

▪ **listener**: *function*

▸ (...`args`: any[]): *void*

**Parameters:**

Name | Type |
------ | ------ |
`...args` | any[] |

**Returns:** *this*

___

###  on

▸ **on**(`event`: string | symbol, `listener`: function): *this*

*Inherited from void*

*Overrides void*

Defined in @types/node/events.d.ts:21

**Parameters:**

▪ **event**: *string | symbol*

▪ **listener**: *function*

▸ (...`args`: any[]): *void*

**Parameters:**

Name | Type |
------ | ------ |
`...args` | any[] |

**Returns:** *this*

___

###  once

▸ **once**(`event`: string | symbol, `listener`: function): *this*

*Inherited from void*

*Overrides void*

Defined in @types/node/events.d.ts:22

**Parameters:**

▪ **event**: *string | symbol*

▪ **listener**: *function*

▸ (...`args`: any[]): *void*

**Parameters:**

Name | Type |
------ | ------ |
`...args` | any[] |

**Returns:** *this*

___

###  prependListener

▸ **prependListener**(`event`: string | symbol, `listener`: function): *this*

*Inherited from void*

*Overrides void*

Defined in @types/node/events.d.ts:23

**Parameters:**

▪ **event**: *string | symbol*

▪ **listener**: *function*

▸ (...`args`: any[]): *void*

**Parameters:**

Name | Type |
------ | ------ |
`...args` | any[] |

**Returns:** *this*

___

###  prependOnceListener

▸ **prependOnceListener**(`event`: string | symbol, `listener`: function): *this*

*Inherited from void*

*Overrides void*

Defined in @types/node/events.d.ts:24

**Parameters:**

▪ **event**: *string | symbol*

▪ **listener**: *function*

▸ (...`args`: any[]): *void*

**Parameters:**

Name | Type |
------ | ------ |
`...args` | any[] |

**Returns:** *this*

___

###  rawListeners

▸ **rawListeners**(`event`: string | symbol): *Function[]*

*Inherited from void*

*Overrides void*

Defined in @types/node/events.d.ts:31

**Parameters:**

Name | Type |
------ | ------ |
`event` | string &#124; symbol |

**Returns:** *Function[]*

___

###  removeAllListeners

▸ **removeAllListeners**(`event?`: string | symbol): *this*

*Inherited from void*

*Overrides void*

Defined in @types/node/events.d.ts:27

**Parameters:**

Name | Type |
------ | ------ |
`event?` | string &#124; symbol |

**Returns:** *this*

___

###  removeListener

▸ **removeListener**(`event`: string | symbol, `listener`: function): *this*

*Inherited from void*

*Overrides void*

Defined in @types/node/events.d.ts:25

**Parameters:**

▪ **event**: *string | symbol*

▪ **listener**: *function*

▸ (...`args`: any[]): *void*

**Parameters:**

Name | Type |
------ | ------ |
`...args` | any[] |

**Returns:** *this*

___

###  request

▸ **request**(`url`: string | Request, `cb?`: function): *Readable*

*Inherited from void*

Defined in typed-sails/index.d.ts:66

**Parameters:**

▪ **url**: *string | Request*

▪`Optional`  **cb**: *function*

▸ (`err`: Error, `response`: any, `body`: any): *void*

**Parameters:**

Name | Type |
------ | ------ |
`err` | Error |
`response` | any |
`body` | any |

**Returns:** *Readable*

▸ **request**(`url`: string, `body`: any, `cb?`: function): *Readable*

*Inherited from void*

Defined in typed-sails/index.d.ts:67

**Parameters:**

▪ **url**: *string*

▪ **body**: *any*

▪`Optional`  **cb**: *function*

▸ (`err`: Error, `response`: any, `body`: any): *void*

**Parameters:**

Name | Type |
------ | ------ |
`err` | Error |
`response` | any |
`body` | any |

**Returns:** *Readable*

___

###  setMaxListeners

▸ **setMaxListeners**(`n`: number): *this*

*Inherited from void*

*Overrides void*

Defined in @types/node/events.d.ts:28

**Parameters:**

Name | Type |
------ | ------ |
`n` | number |

**Returns:** *this*

___

### `Static` listenerCount

▸ **listenerCount**(`emitter`: EventEmitter, `event`: string | symbol): *number*

*Inherited from void*

Defined in @types/node/events.d.ts:17

**`deprecated`** since v4.0.0

**Parameters:**

Name | Type |
------ | ------ |
`emitter` | EventEmitter |
`event` | string &#124; symbol |

**Returns:** *number*
