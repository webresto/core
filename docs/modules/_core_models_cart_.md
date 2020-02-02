[@webresto/core - v0.7.0-rc1](../README.md) › [Globals](../globals.md) › ["core/models/Cart"](_core_models_cart_.md)

# External module: "core/models/Cart"

**`api`** {API} Cart Cart

**`apigroup`** Models

**`apidescription`** Модель корзины. Имеет в себе список блюд, данные про них, методы для добавления/удаления блюд

**`apiparam`** {Integer} id Уникальный идентификатор

**`apiparam`** {String} cartId ID корзины, по которой к ней обращается внешнее апи

**`apiparam`** {[CartDish](#api-Models-ApiCartdish)[]} dishes Массив блюд в текущей корзине. Смотри [CartDish](#api-Models-ApiCartdish)

**`apiparam`** {Integer} countDishes Общее количество блюд в корзине (с модификаторами)

**`apiparam`** {Integer} uniqueDishes Количество уникальных блюд в корзине

**`apiparam`** {Integer} cartTotal Стоимость корзины без доставки

**`apiparam`** {Integer} total Стоимость корзины с доставкой

**`apiparam`** {Float} delivery Стоимость доставки

**`apiparam`** {Boolean} problem Есть ли проблема с отправкой на IIKO

**`apiparam`** {JSON} customer Данные о заказчике

**`apiparam`** {JSON} address Данные о адресе доставки

**`apiparam`** {String} comment Комментарий к заказу

**`apiparam`** {Integer} personsCount Количество персон

**`apiparam`** {Boolean} sendToIiko Был ли отправлен заказ IIKO

**`apiparam`** {String} rmsId ID заказа, который пришёл от IIKO

**`apiparam`** {String} deliveryStatus Статус состояния доставки (0 успешно расчитана)

**`apiparam`** {Boolean} selfDelivery Признак самовывоза

**`apiparam`** {String} deliveryDescription Строка дополнительной информации о доставке

**`apiparam`** {String} message Сообщение, что отправляется с корзиной

## Index

### Modules

* [__global](_core_models_cart_.__global.md)

### Interfaces

* [Cart](../interfaces/_core_models_cart_.cart.md)
* [CartModel](../interfaces/_core_models_cart_.cartmodel.md)

### Functions

* [checkAddress](_core_models_cart_.md#checkaddress)
* [checkCustomerInfo](_core_models_cart_.md#checkcustomerinfo)

## Functions

###  checkAddress

▸ **checkAddress**(`address`: any): *void*

Defined in @webresto/core/models/Cart.ts:748

**Parameters:**

Name | Type |
------ | ------ |
`address` | any |

**Returns:** *void*

___

###  checkCustomerInfo

▸ **checkCustomerInfo**(`customer`: any): *Promise‹void›*

Defined in @webresto/core/models/Cart.ts:715

**Parameters:**

Name | Type |
------ | ------ |
`customer` | any |

**Returns:** *Promise‹void›*
