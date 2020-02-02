[@webresto/core - v0.7.0-rc1](../README.md) › [Globals](../globals.md) › ["core/lib/causes"](_core_lib_causes_.md)

# External module: "core/lib/causes"

## Index

### Enumerations

* [Weekdays](../enums/_core_lib_causes_.weekdays.md)

### Type aliases

* [causeFunc](_core_lib_causes_.md#causefunc)
* [customCause](_core_lib_causes_.md#customcause)

### Variables

* [customCauses](_core_lib_causes_.md#const-customcauses)

### Functions

* [addCause](_core_lib_causes_.md#addcause)
* [addCauseByFields](_core_lib_causes_.md#addcausebyfields)
* [between](_core_lib_causes_.md#between)
* [causes](_core_lib_causes_.md#causes)
* [checkDistance](_core_lib_causes_.md#checkdistance)
* [checkTime](_core_lib_causes_.md#checktime)

## Type aliases

###  causeFunc

Ƭ **causeFunc**: *function*

Defined in @webresto/core/lib/causes.ts:15

#### Type declaration:

▸ (`condition`: [Condition](../interfaces/_core_models_condition_.condition.md), `cart?`: [Cart](../interfaces/_core_models_cart_.cart.md)): *boolean | Promise‹boolean›*

**Parameters:**

Name | Type |
------ | ------ |
`condition` | [Condition](../interfaces/_core_models_condition_.condition.md) |
`cart?` | [Cart](../interfaces/_core_models_cart_.cart.md) |

___

###  customCause

Ƭ **customCause**: *object*

Defined in @webresto/core/lib/causes.ts:9

#### Type declaration:

* **fn**: *[causeFunc](_core_lib_causes_.md#causefunc)*

* **name**: *string*

* **needCart**: *boolean*

## Variables

### `Const` customCauses

• **customCauses**: *[customCause](_core_lib_causes_.md#customcause)[]* =  []

Defined in @webresto/core/lib/causes.ts:17

## Functions

###  addCause

▸ **addCause**(`cause`: [customCause](_core_lib_causes_.md#customcause)): *void*

Defined in @webresto/core/lib/causes.ts:116

Add new cause in custom causes

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`cause` | [customCause](_core_lib_causes_.md#customcause) | new cause object  |

**Returns:** *void*

___

###  addCauseByFields

▸ **addCauseByFields**(`name`: string, `needCart`: boolean, `fn`: [causeFunc](_core_lib_causes_.md#causefunc)): *void*

Defined in @webresto/core/lib/causes.ts:108

Add new cause in custom causes

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`name` | string | cause name |
`needCart` | boolean | if true in fn will be cart as second param |
`fn` | [causeFunc](_core_lib_causes_.md#causefunc) | call back to check cause in condition and cart  |

**Returns:** *void*

___

###  between

▸ **between**(`from`: number, `to`: number, `a`: number): *boolean*

Defined in @webresto/core/lib/causes.ts:195

Check that in (a,b,c) c is between a and b

**Parameters:**

Name | Type |
------ | ------ |
`from` | number |
`to` | number |
`a` | number |

**Returns:** *boolean*

___

###  causes

▸ **causes**(`condition`: [Condition](../interfaces/_core_models_condition_.condition.md), `cart`: [Cart](../interfaces/_core_models_cart_.cart.md)): *Promise‹boolean›*

Defined in @webresto/core/lib/causes.ts:25

Check some condition from some cart

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`condition` | [Condition](../interfaces/_core_models_condition_.condition.md) | condition for check |
`cart` | [Cart](../interfaces/_core_models_cart_.cart.md) | cart for check |

**Returns:** *Promise‹boolean›*

___

###  checkDistance

▸ **checkDistance**(`cart`: [Cart](../interfaces/_core_models_cart_.cart.md), `data`: [DirectDistance](../interfaces/_core_modelshelp_cause_.directdistance.md)): *Promise‹boolean›*

Defined in @webresto/core/lib/causes.ts:204

Check distance between cart address and data DirectDistance info

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`cart` | [Cart](../interfaces/_core_models_cart_.cart.md) | - |
`data` | [DirectDistance](../interfaces/_core_modelshelp_cause_.directdistance.md) |   |

**Returns:** *Promise‹boolean›*

___

###  checkTime

▸ **checkTime**(`timeArray`: [Time](../interfaces/_core_modelshelp_cause_.time.md)[]): *boolean*

Defined in @webresto/core/lib/causes.ts:134

Check that current time is in time of paras

**`example`** 
timeArray: [
 {
   dayOfWeek: 'monday',
   start: '8:00',
   end: '18:00'
 },
 {...}
]

**Parameters:**

Name | Type |
------ | ------ |
`timeArray` | [Time](../interfaces/_core_modelshelp_cause_.time.md)[] |

**Returns:** *boolean*
