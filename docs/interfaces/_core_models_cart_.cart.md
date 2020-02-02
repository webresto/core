[@webresto/core - v0.7.0-rc1](../README.md) › [Globals](../globals.md) › ["core/models/Cart"](../modules/_core_models_cart_.md) › [Cart](_core_models_cart_.cart.md)

# Interface: Cart

Описывает модель корзины. Содержит в себе блюда и данных о них, данные о заказчике и месте доставки.
Имеет состояние state, которое указывает в каком моменте жизненного цикла сейчас находится корзина.
Схематически цикл переходов выглядить так
-> CART <-> CHECKOUT  -> COMPLETE

## Hierarchy

* [ORM](_core_modelshelp_orm_.orm.md)

* [StateFlow](_core_modelshelp_stateflow_.stateflow.md)

  ↳ **Cart**

## Index

### Properties

* [address](_core_models_cart_.cart.md#address)
* [cartId](_core_models_cart_.cart.md#cartid)
* [cartTotal](_core_models_cart_.cart.md#carttotal)
* [comment](_core_models_cart_.cart.md#comment)
* [customer](_core_models_cart_.cart.md#customer)
* [delivery](_core_models_cart_.cart.md#delivery)
* [deliveryDescription](_core_models_cart_.cart.md#deliverydescription)
* [deliveryItem](_core_models_cart_.cart.md#deliveryitem)
* [deliveryStatus](_core_models_cart_.cart.md#deliverystatus)
* [dishes](_core_models_cart_.cart.md#dishes)
* [dishesCount](_core_models_cart_.cart.md#dishescount)
* [id](_core_models_cart_.cart.md#id)
* [message](_core_models_cart_.cart.md#message)
* [modifiers](_core_models_cart_.cart.md#modifiers)
* [personsCount](_core_models_cart_.cart.md#personscount)
* [problem](_core_models_cart_.cart.md#problem)
* [rmsId](_core_models_cart_.cart.md#rmsid)
* [selfDelivery](_core_models_cart_.cart.md#selfdelivery)
* [sendToIiko](_core_models_cart_.cart.md#sendtoiiko)
* [state](_core_models_cart_.cart.md#state)
* [total](_core_models_cart_.cart.md#total)
* [totalWeight](_core_models_cart_.cart.md#totalweight)
* [uniqueDishes](_core_models_cart_.cart.md#uniquedishes)

### Methods

* [add](_core_models_cart_.cart.md#add)
* [addDish](_core_models_cart_.cart.md#adddish)
* [check](_core_models_cart_.cart.md#check)
* [destroy](_core_models_cart_.cart.md#destroy)
* [getState](_core_models_cart_.cart.md#getstate)
* [next](_core_models_cart_.cart.md#next)
* [order](_core_models_cart_.cart.md#order)
* [remove](_core_models_cart_.cart.md#remove)
* [removeDish](_core_models_cart_.cart.md#removedish)
* [save](_core_models_cart_.cart.md#save)
* [setComment](_core_models_cart_.cart.md#setcomment)
* [setCount](_core_models_cart_.cart.md#setcount)
* [setModifierCount](_core_models_cart_.cart.md#setmodifiercount)
* [setSelfDelivery](_core_models_cart_.cart.md#setselfdelivery)

## Properties

###  address

• **address**: *[Address](_core_modelshelp_address_.address.md)*

Defined in @webresto/core/models/Cart.ts:787

___

###  cartId

• **cartId**: *string*

Defined in @webresto/core/models/Cart.ts:779

___

###  cartTotal

• **cartTotal**: *number*

Defined in @webresto/core/models/Cart.ts:783

___

###  comment

• **comment**: *string*

Defined in @webresto/core/models/Cart.ts:788

___

###  customer

• **customer**: *[Customer](_core_modelshelp_customer_.customer.md)*

Defined in @webresto/core/models/Cart.ts:786

___

###  delivery

• **delivery**: *number*

Defined in @webresto/core/models/Cart.ts:785

___

###  deliveryDescription

• **deliveryDescription**: *string*

Defined in @webresto/core/models/Cart.ts:795

___

###  deliveryItem

• **deliveryItem**: *string*

Defined in @webresto/core/models/Cart.ts:797

___

###  deliveryStatus

• **deliveryStatus**: *number*

Defined in @webresto/core/models/Cart.ts:793

___

###  dishes

• **dishes**: *[Association](../modules/_core_lib_globaltypes_.__global.md#association)‹[CartDish](_core_models_cartdish_.cartdish.md)›*

Defined in @webresto/core/models/Cart.ts:780

___

###  dishesCount

• **dishesCount**: *number*

Defined in @webresto/core/models/Cart.ts:781

___

###  id

• **id**: *string*

Defined in @webresto/core/models/Cart.ts:778

___

###  message

• **message**: *string*

Defined in @webresto/core/models/Cart.ts:796

___

###  modifiers

• **modifiers**: *[Modifier](_core_modelshelp_modifier_.modifier.md)[]*

Defined in @webresto/core/models/Cart.ts:784

___

###  personsCount

• **personsCount**: *number*

Defined in @webresto/core/models/Cart.ts:789

___

###  problem

• **problem**: *boolean*

Defined in @webresto/core/models/Cart.ts:790

___

###  rmsId

• **rmsId**: *string*

Defined in @webresto/core/models/Cart.ts:792

___

###  selfDelivery

• **selfDelivery**: *boolean*

Defined in @webresto/core/models/Cart.ts:794

___

###  sendToIiko

• **sendToIiko**: *boolean*

Defined in @webresto/core/models/Cart.ts:791

___

###  state

• **state**: *string*

*Inherited from [StateFlow](_core_modelshelp_stateflow_.stateflow.md).[state](_core_modelshelp_stateflow_.stateflow.md#state)*

Defined in @webresto/core/modelsHelp/StateFlow.ts:5

___

###  total

• **total**: *number*

Defined in @webresto/core/models/Cart.ts:799

___

###  totalWeight

• **totalWeight**: *number*

Defined in @webresto/core/models/Cart.ts:798

___

###  uniqueDishes

• **uniqueDishes**: *number*

Defined in @webresto/core/models/Cart.ts:782

## Methods

###  add

▸ **add**(): *any*

*Inherited from [ORM](_core_modelshelp_orm_.orm.md).[add](_core_modelshelp_orm_.orm.md#add)*

Defined in @webresto/core/modelsHelp/ORM.ts:11

**Returns:** *any*

___

###  addDish

▸ **addDish**(`dish`: [Dish](_core_models_dish_.dish.md) | string, `amount`: number, `modifiers`: [Modifier](_core_modelshelp_modifier_.modifier.md)[], `comment`: string, `from`: string): *Promise‹void›*

Defined in @webresto/core/models/Cart.ts:823

Добавление блюда в текущую корзину, указывая количество, модификаторы, комментарий и откуда было добавлено блюдо.
Если количество блюд ограничено и требуется больше блюд, нежели присутствует, то сгенерировано исключение.
Переводит корзину в состояние CART, если она ещё не в нём.

**`throws`** Object {
  body: string,
  code: number
}
where codes:
 1 - не достаточно блюд
 2 - заданное блюдо не найдено

**`fires`** cart:core-cart-before-add-dish - вызывается перед началом функции. Результат подписок игнорируется.

**`fires`** cart:core-cart-add-dish-reject-amount - вызывается перед ошибкой о недостатке блюд. Результат подписок игнорируется.

**`fires`** cart:core-cart-add-dish-before-create-cartdish - вызывается, если все проверки прошли успешно и корзина намеряна
добавить блюдо. Результат подписок игнорируется.

**`fires`** cart:core-cart-after-add-dish - вызывается после успешного добавления блюда. Результат подписок игнорируется.

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`dish` | [Dish](_core_models_dish_.dish.md) &#124; string | Блюдо для добавления, может быть объект или id блюда |
`amount` | number | количетво |
`modifiers` | [Modifier](_core_modelshelp_modifier_.modifier.md)[] | модификаторы, которые следует применить к текущему блюду |
`comment` | string | комментарий к блюду |
`from` | string | указатель откуда было добавлено блюдо (например, от пользователя или от системы акций) |

**Returns:** *Promise‹void›*

___

###  check

▸ **check**(`customer`: [Customer](_core_modelshelp_customer_.customer.md), `isSelfService`: boolean, `address?`: [Address](_core_modelshelp_address_.address.md)): *Promise‹boolean›*

Defined in @webresto/core/models/Cart.ts:925

Проверяет ваидность customer. Проверка проходит на наличие полей и их валидность соответсвенно nameRegex и phoneRegex
из конфига. Если указан isSelfService: false, то так же проверяется валидность address на наличие полей и вызывается
`core-cart-check` событие. Каждый подписанный елемент влияет на результат проверки. В зависимости от настроек функция
отдаёт успешность проверки.

**`fires`** cart:core-cart-before-check - вызывается перед началом функции. Результат подписок игнорируется.

**`fires`** cart:core-cart-check-self-service - вызывается если isSelfService==true перед начало логики изменения корзины. Результат подписок игнорируется.

**`fires`** cart:core-cart-check-delivery - вызывается после проверки customer если isSelfService==false. Результат подписок игнорируется.

**`fires`** cart:core-cart-check - проверка заказа на возможность исполнения. Результат исполнения каждого подписчика влияет на результат.

**`fires`** cart:core-cart-after-check - событие сразу после выполнения основной проверки. Результат подписок игнорируется.

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`customer` | [Customer](_core_modelshelp_customer_.customer.md) | данные заказчика |
`isSelfService` | boolean | является ли самовывозов |
`address?` | [Address](_core_modelshelp_address_.address.md) | адресс, обязательный, если это самовывоз |

**Returns:** *Promise‹boolean›*

Результат проверки. Если проверка данных заказчика или адресса в случае самомвывоза дали ошибку, то false. Иначе,
если в конфиге checkConfig.requireAll==true, то успех функции только в случае, если все подписки `core-cart-check` вернули положительный результат работы.
Если в конфгие checkConfig.notRequired==true, то независимо от результата всех подписчиков `core-cart-check` будет положительный ответ.
Иначе если хотя бы один подписчик `core-cart-check` ответил успешно, то вся функция считается успешной.
Если результат был успешен, то корзина переходит из состояния CART в CHECKOUT.

___

###  destroy

▸ **destroy**(): *Promise‹void›*

*Inherited from [ORM](_core_modelshelp_orm_.orm.md).[destroy](_core_modelshelp_orm_.orm.md#destroy)*

Defined in @webresto/core/modelsHelp/ORM.ts:5

**Returns:** *Promise‹void›*

___

###  getState

▸ **getState**(): *string*

*Inherited from [StateFlow](_core_modelshelp_stateflow_.stateflow.md).[getState](_core_modelshelp_stateflow_.stateflow.md#getstate)*

Defined in @webresto/core/modelsHelp/StateFlow.ts:7

**Returns:** *string*

___

###  next

▸ **next**(`state?`: string): *Promise‹void›*

*Inherited from [StateFlow](_core_modelshelp_stateflow_.stateflow.md).[next](_core_modelshelp_stateflow_.stateflow.md#next)*

Defined in @webresto/core/modelsHelp/StateFlow.ts:9

**Parameters:**

Name | Type |
------ | ------ |
`state?` | string |

**Returns:** *Promise‹void›*

___

###  order

▸ **order**(): *Promise‹number›*

Defined in @webresto/core/models/Cart.ts:940

Вызывет core-cart-order. Каждый подписанный елемент влияет на результат заказа. В зависимости от настроек функция
отдаёт успешность заказа.

**`fires`** cart:core-cart-before-order - вызывается перед началом функции. Результат подписок игнорируется.

**`fires`** cart:core-cart-order-self-service - вызывается, если совершается заказ с самовывозом.

**`fires`** cart:core-cart-order-delivery - вызывается, если заказ без самовывоза

**`fires`** cart:core-cart-order - событие заказа. Каждый слушатель этого события влияет на результат события.

**`fires`** cart:core-cart-after-order - вызывается сразу после попытки оформить заказ.

**Returns:** *Promise‹number›*

код результата:
 - 0 - успешно проведённый заказ от всех слушателей.
 - 1 - ни один слушатель не смог успешно сделать заказ.
 - 2 - по крайней мере один слушатель успешно выполнил заказ.

___

###  remove

▸ **remove**(): *any*

*Inherited from [ORM](_core_modelshelp_orm_.orm.md).[remove](_core_modelshelp_orm_.orm.md#remove)*

Defined in @webresto/core/modelsHelp/ORM.ts:9

**Returns:** *any*

___

###  removeDish

▸ **removeDish**(`dish`: [CartDish](_core_models_cartdish_.cartdish.md), `amount`: number): *Promise‹void›*

Defined in @webresto/core/models/Cart.ts:839

Уменьшает количество заданного блюда на amount. Переводит корзину в состояние CART.

**`throws`** Object {
  body: string,
  code: number
}
where codes:
 1 - заданный CartDish не найден в текущей корзине
 @fires cart:core-cart-before-remove-dish - вызывается перед началом фунции. Результат подписок игнорируется.
 @fires cart:core-cart-remove-dish-reject-no-cartdish - вызывается, если dish не найден в текущей корзине. Результат подписок игнорируется.
 @fires cart:core-cart-after-remove-dish - вызывается после успешной работы функции. Результат подписок игнорируется.

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`dish` | [CartDish](_core_models_cartdish_.cartdish.md) | Блюдо для изменения количества блюд |
`amount` | number | насколько меньше сделать количество |

**Returns:** *Promise‹void›*

___

###  save

▸ **save**(): *Promise‹void›*

*Inherited from [ORM](_core_modelshelp_orm_.orm.md).[save](_core_modelshelp_orm_.orm.md#save)*

Defined in @webresto/core/modelsHelp/ORM.ts:7

**Returns:** *Promise‹void›*

___

###  setComment

▸ **setComment**(`dish`: [CartDish](_core_models_cartdish_.cartdish.md), `comment`: string): *Promise‹void›*

Defined in @webresto/core/models/Cart.ts:898

Меняет комментарий заданного блюда в текущей корзине

**`throws`** Object {
  body: string,
  error: number
}
where codes:
1 - блюдо dish не найдено в текущей корзине

**`fires`** cart:core-cart-before-set-comment - вызывается перед началом фунции. Результат подписок игнорируется.

**`fires`** cart:core-cart-set-comment-reject-no-cartdish - вызывается перед ошибкой о том, что блюдо не найдено. Результат подписок игнорируется.

**`fires`** cart:core-cart-after-set-comment - вызывается после успешной работы функции. Результат подписок игнорируется.

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`dish` | [CartDish](_core_models_cartdish_.cartdish.md) | какому блюду менять комментарий |
`comment` | string | новый комментарий |

**Returns:** *Promise‹void›*

___

###  setCount

▸ **setCount**(`dish`: [CartDish](_core_models_cartdish_.cartdish.md), `amount`: number): *Promise‹void›*

Defined in @webresto/core/models/Cart.ts:858

Устанавливает заданное количество для заданного блюда в текущей корзине. Если количество меньше 0, то блюдо будет
удалено из корзины. Переводит корзину в состояние CART.

**`throws`** Object {
  body: string,
  code: number
}
where codes:
 1 - нет такого количества блюд
 2 - заданный CartDish не найден

**`fires`** cart:core-cart-before-set-count - вызывается перед началом фунции. Результат подписок игнорируется.

**`fires`** cart:core-cart-set-count-reject-amount - вызывается перед ошибкой о недостатке блюд. Результат подписок игнорируется.

**`fires`** cart:core-cart-after-set-count - вызывается после успешной работы функции. Результат подписок игнорируется.

**`fires`** cart:core-cart-set-count-reject-no-cartdish - вызывается, если dish не найден в текущей корзине. Результат подписок игнорируется.

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`dish` | [CartDish](_core_models_cartdish_.cartdish.md) | какому блюду измениять количество |
`amount` | number | новое количество |

**Returns:** *Promise‹void›*

___

###  setModifierCount

▸ **setModifierCount**(`dish`: [CartDish](_core_models_cartdish_.cartdish.md), `modifier`: [Dish](_core_models_dish_.dish.md), `amount`: number): *Promise‹void›*

Defined in @webresto/core/models/Cart.ts:882

Устанавливает заданному модификатору в заданом блюде в текузей заданное количество.
В случае успешной работы изменяет состояние корзины в CART

**`throws`** Object {
  body: string,
  code: number
}
where codes:
1 - нет достаточного количества блюд
2 - dish не найден в текущей корзине
3 - блюдо modifier не найден как модификатор блюда dish
4 - блюдо dish в текущей корзине не содержит модификатора modifier

**`fires`** cart:core-cart-before-set-modifier-count - вызывается перед началом фунции. Результат подписок игнорируется.

**`fires`** cart:core-cart-set-modifier-count-reject-amount - вызывается перед ошибкой о недостатке блюд. Результат подписок игнорируется.

**`fires`** cart:core-cart-set-modifier-count-reject-no-cartdish - вызывается перед ошибкой с кодом 2. Результат подписок игнорируется.

**`fires`** cart:core-cart-set-modifier-count-reject-no-modifier-dish - вызывается перед ошибкой с кодом 3. Результат подписок игнорируется.

**`fires`** cart:core-cart-set-modifier-count-reject-no-modifier-in-dish - вызывается перед ошибкой с кодом 4. Результат подписок игнорируется.

**`fires`** cart:core-cart-after-set-modifier-count - вызывается после успешной работы функции. Результат подписок игнорируется.

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`dish` | [CartDish](_core_models_cartdish_.cartdish.md) | блюдо, модификатор которого изменять |
`modifier` | [Dish](_core_models_dish_.dish.md) | id блюда, которое привязано к модификатору, количество которого менять |
`amount` | number | новое количество |

**Returns:** *Promise‹void›*

___

###  setSelfDelivery

▸ **setSelfDelivery**(`selfService`: boolean): *Promise‹void›*

Defined in @webresto/core/models/Cart.ts:904

Меняет поле корзины selfDelivery на заданное. Используйте только этот метод для изменения параметра selfDelivery.

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`selfService` | boolean |   |

**Returns:** *Promise‹void›*
