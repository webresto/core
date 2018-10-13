<a name="top"></a>
# Restocore v0.5.2

Sails hook for any cafe based on IIKO

- [Cart](#cart)
	- [Добавить блюдо в корзину](#добавить-блюдо-в-корзину)
	- [Получение корзины](#получение-корзины)
	- [Удаление блюда из корзины](#удаление-блюда-из-корзины)
	- [Установить кол-во порций](#установить-кол-во-порций)
	
- [Config](#config)
	- [Конфигурация](#конфигурация)
	
- [Controller](#controller)
	- [Request directly to IIKO api](#request-directly-to-iiko-api)
	- [Получение улиц](#получение-улиц)
	- [Системная информация](#системная-информация)
	
- [Menu](#menu)
	- [Получение группы](#получение-группы)
	- [Получение групп](#получение-групп)
	- [Получение отдельного блюда](#получение-отдельного-блюда)
	- [Стоп список](#стоп-список)
	- [Полное меню](#полное-меню)
	
- [Models](#models)
	- [Cart](#cart)
	- [CartDish](#cartdish)
	- [Dish](#dish)
	- [Group](#group)
	- [Image](#image)
	- [Street](#street)
	- [SystemInfo](#systeminfo)
	- [Tags](#tags)
	
- [Order](#order)
	- [Проверка заказа](#проверка-заказа)
	- [Создание заказа](#создание-заказа)
	


# <a name='cart'></a> Cart

## <a name='добавить-блюдо-в-корзину'></a> Добавить блюдо в корзину
[Back to top](#top)

<p>Добавление блюда в корзину с задаными модификаторами</p>

	PUT /api/0.5/cart/add





### Parameter Parameters

| Name     | Type       | Description                           |
|:---------|:-----------|:--------------------------------------|
|  cartId | String | **optional**<p>ID корзины в которую добавляют блюдо. Если не задано, то создаётся новая корзина</p>|
|  amount | Integer | **optional**<p>Количество порций</p>_Default value: 1_<br>|
|  modifiers | JSON | **optional**<p>JSON модификаторов для блюда</p>|
|  dishId | String | <p>ID блюда, которое добавляется в корзину. Тут dishId - id из CartDish</p>|

### Param Examples

(JSON)
Modifiers example:

```
{
     "id": "string (required)",
     "amount": "integer (required)",
     "groupId": "string (required for group modifiers)"
}
```

### Success Response

Message:

```
{
  "type": "info",
  "title": "ok",
  "body": ""
}
```

### Success 200

| Name     | Type       | Description                           |
|:---------|:-----------|:--------------------------------------|
|  message | JSON | <p>Сообщение от сервера</p>|
|  cart | Cart | <p>Cart model</p>|

### Error Response

BadRequest 400

```
{
     "type": "error",
     "title": "bad request",
     "body": {
       "error": "dishId is required"
     }
}
```
ServerError 500

```
{
     "type": "error",
     "title": "server error",
     "body": {
       "invalidAttributes": {
         "...": "..."
       },
       "model": "User",
       "_e": { },
       "rawStack": "...",
       "reason": "...",
       "code": "E_VALIDATION",
       "status": 500,
       "details": "...",
       "message": "...",
       "stack": "..."
     }
}
```
NotFound 404

```
{
     "type": "error",
     "title": "not found",
     "body": "Method not found: GET"
}
```
## <a name='получение-корзины'></a> Получение корзины
[Back to top](#top)

<p>Получение объкта корзины по её ID</p>

	GET /api/0.5/cart





### Parameter Parameters

| Name     | Type       | Description                           |
|:---------|:-----------|:--------------------------------------|
|  cartId | String | <p>ID корзины для получения</p>|


### Success Response

Message:

```
{
  "type": "info",
  "title": "ok",
  "body": ""
}
```

### Success 200

| Name     | Type       | Description                           |
|:---------|:-----------|:--------------------------------------|
|  message | JSON | <p>Сообщение от сервера</p>|
|  cart | Cart | <p>Cart model</p>|

### Error Response

BadRequest 400

```
{
     "type": "error",
     "title": "bad request",
     "body": {
       "error": "dishId is required"
     }
}
```
ServerError 500

```
{
     "type": "error",
     "title": "server error",
     "body": {
       "invalidAttributes": {
         "...": "..."
       },
       "model": "User",
       "_e": { },
       "rawStack": "...",
       "reason": "...",
       "code": "E_VALIDATION",
       "status": 500,
       "details": "...",
       "message": "...",
       "stack": "..."
     }
}
```
NotFound 404

```
{
     "type": "error",
     "title": "not found",
     "body": "Method not found: GET"
}
```
## <a name='удаление-блюда-из-корзины'></a> Удаление блюда из корзины
[Back to top](#top)

<p>Удаление блюда из заданой корзины. По сути уменьшение количества.</p>

	PUT /api/0.5/cart/remove





### Parameter Parameters

| Name     | Type       | Description                           |
|:---------|:-----------|:--------------------------------------|
|  cartId | String | <p>ID корзины из которой удаляется блюдо</p>|
|  amount | Integer | **optional**<p>количество удаляемых порций</p>_Default value: 1_<br>|
|  dishId | String | <p>Блюдо, которому меняется количество порций. Тут dishId - id из CartDish</p>|


### Success Response

Message:

```
{
  "type": "info",
  "title": "ok",
  "body": ""
}
```

### Success 200

| Name     | Type       | Description                           |
|:---------|:-----------|:--------------------------------------|
|  message | JSON | <p>Сообщение от сервера</p>|
|  cart | Cart | <p>Cart model</p>|

### Error Response

BadRequest 400

```
{
     "type": "error",
     "title": "bad request",
     "body": {
       "error": "dishId is required"
     }
}
```
ServerError 500

```
{
     "type": "error",
     "title": "server error",
     "body": {
       "invalidAttributes": {
         "...": "..."
       },
       "model": "User",
       "_e": { },
       "rawStack": "...",
       "reason": "...",
       "code": "E_VALIDATION",
       "status": 500,
       "details": "...",
       "message": "...",
       "stack": "..."
     }
}
```
NotFound 404

```
{
     "type": "error",
     "title": "not found",
     "body": "Method not found: GET"
}
```
## <a name='установить-кол-во-порций'></a> Установить кол-во порций
[Back to top](#top)

<p>Установка количества порций для блюда в корзине. Если меньше нуля или ноль, то блюдо удаляется из корзины</p>

	POST /api/0.5/cart/set





### Parameter Parameters

| Name     | Type       | Description                           |
|:---------|:-----------|:--------------------------------------|
|  dishId | String | <p>ID блюда, которому меняет количество порций</p>|
|  cartId | String | **optional**<p>ID корзины в которую добавляют блюдо. Если не задано, то создаётся новая корзина</p>|
|  amount | Integer | **optional**<p>Установка количества порций</p>_Default value: 1_<br>|


### Success Response

Message:

```
{
  "type": "info",
  "title": "ok",
  "body": ""
}
```

### Success 200

| Name     | Type       | Description                           |
|:---------|:-----------|:--------------------------------------|
|  message | JSON | <p>Сообщение от сервера</p>|
|  cart | Cart | <p>Cart model</p>|

### Error Response

BadRequest 400

```
{
     "type": "error",
     "title": "bad request",
     "body": {
       "error": "dishId is required"
     }
}
```
ServerError 500

```
{
     "type": "error",
     "title": "server error",
     "body": {
       "invalidAttributes": {
         "...": "..."
       },
       "model": "User",
       "_e": { },
       "rawStack": "...",
       "reason": "...",
       "code": "E_VALIDATION",
       "status": 500,
       "details": "...",
       "message": "...",
       "stack": "..."
     }
}
```
NotFound 404

```
{
     "type": "error",
     "title": "not found",
     "body": "Method not found: GET"
}
```
# <a name='config'></a> Config

## <a name='конфигурация'></a> Конфигурация
[Back to top](#top)

<p>Описание конфигураций</p>

	CONFIG restocore.js





### Parameter Parameters

| Name     | Type       | Description                           |
|:---------|:-----------|:--------------------------------------|
|  timeSyncBalance | Number | <p>Время цикла проверки стоп списка в секундах (например, каждые timeSyncBalance: 30 секунд)</p>|
|  timeSyncMenu | Number | <p>Время цикла синхронизации номенклатуры в секундах</p>|
|  timeSyncStreets | Number | <p>Время цикла синхронизации улиц в часах</p>|
|  development | Boolean | <p>Является ли приложение в разработке (позволяет образаться к /api/0.5/api/...)</p>|
|  masterKey | String | <p>Если приложение не в разработке, то для доступа к /api/0.5/api/... требуется этот параметр</p>|
|  city | String | <p>Название города, в котором находтся кафе</p>|
|  defaultName | String | **optional**<p>Имя пользоваьеля, что используется при проверки осуществляемости заказа</p>|
|  defaultPhone | String | **optional**<p>Телефон, аналогично предыдущему</p>|
|  iiko | JSON | <p>Параметры для сервера IIKO</p>|
|  images | JSON | **optional**<p>Параметр для обработки картинок. Если его нет, то картнки от IIKO не обрабатываются вовсе. В размерах один из параметров (width или height) обязательный.</p>|

### Param Examples

(json)
iiko types

```
{
  host: string,
  port: string,
  login: string,
  password: string,
  organization: string,
  deliveryTerminalId: string
}
```
(json)
iiko example

```
{
  host: "iiko.biz",
  port: "9900",
  login: "Cafe",
  password: "ldfkgREKn456",
  organization: "e1c2da5e-810b-e1ef-0159-4ae27e1a299a",
  deliveryTerminalId: "e464c693-4a57-11e5-80c1-d8d385655247"
}
```
(json)
image types

```
{
  path: string,
  "name of size": {
    [width]: number,
    [height]: number
  },
  ...
}
```
(json)
image example

```
{
  path: "/images",
  small: {
    width: 200,
    height: 200
  },
  large: {
    width: 900
  },
  forPreview: {
    height: 500
  }
}
```



# <a name='controller'></a> Controller

## <a name='request-directly-to-iiko-api'></a> Request directly to IIKO api
[Back to top](#top)

<p>Request work only in development mode or if in config exists master key and front send this key with parameters</p>

	GET /api/0.5/api/:method





### Parameter Parameters

| Name     | Type       | Description                           |
|:---------|:-----------|:--------------------------------------|
|  method | String | <p>Method to send IIKO</p>|
|  params | Any | <p>Params for this request required in IIKO</p>|
|  master | String | <p>Master key. Required in not development mode</p>|



### Success 200

| Name     | Type       | Description                           |
|:---------|:-----------|:--------------------------------------|
|  Object | JSON | <p>Required data from IIKO</p>|

## <a name='получение-улиц'></a> Получение улиц
[Back to top](#top)

<p>Получение всех улиц, что обслуживает кафе</p>

	GET /api/0.5/streets






### Success 200

| Name     | Type       | Description                           |
|:---------|:-----------|:--------------------------------------|
|  Array | Street[] | <p>Массив улиц</p>|

## <a name='системная-информация'></a> Системная информация
[Back to top](#top)

<p>Получение информации о организации и ID терминала</p>

	GET /api/0.5/system






### Success 200

| Name     | Type       | Description                           |
|:---------|:-----------|:--------------------------------------|
|  organization | String | <p>Организация</p>|
|  deliveryTerminalId | String | <p>Терминал</p>|
|  data | Array | <p>Информация о организации, содержащаяся на сервере IIKO</p>|

# <a name='menu'></a> Menu

## <a name='получение-группы'></a> Получение группы
[Back to top](#top)

<p>Получение группы без блюд но с иерархией дочерных групп по её ID</p>

	GET /api/0.5/groups






### Success 200

| Name     | Type       | Description                           |
|:---------|:-----------|:--------------------------------------|
|  group | Group | <p>Запрашиваемая группа</p>|

## <a name='получение-групп'></a> Получение групп
[Back to top](#top)

<p>Получение групп без блюд но с иерархией дочерных групп</p>

	GET /api/0.5/groups






### Success 200

| Name     | Type       | Description                           |
|:---------|:-----------|:--------------------------------------|
|  Array | Group[] | <p>Список групп, которые не имеют родительских</p>|

## <a name='получение-отдельного-блюда'></a> Получение отдельного блюда
[Back to top](#top)

<p>Получение блюда по его ID или slug. Запрос только по одному из двух полей ниже</p>

	GET /api/0.5/menu





### Parameter Parameters

| Name     | Type       | Description                           |
|:---------|:-----------|:--------------------------------------|
|  dishId | String | <p>ID блюда для получения</p>|
|  slug | String | <p>Slug блюда для получения</p>|



### Success 200

| Name     | Type       | Description                           |
|:---------|:-----------|:--------------------------------------|
|  DishObject | Dish | <p>Запрашиваемое блюдо</p>|

## <a name='стоп-список'></a> Стоп список
[Back to top](#top)

<p>Получение стоп списка блюд</p>

	GET /api/0.5/stoplist






### Success 200

| Name     | Type       | Description                           |
|:---------|:-----------|:--------------------------------------|
|  Array | Street[] | <p>Список гланых групп (которые не имеют родительских групп) с полной иехрархией всех дочерних групп и блюд</p>|

## <a name='полное-меню'></a> Полное меню
[Back to top](#top)

<p>Получение иерархии меню</p>

	GET /api/0.5/menu






### Success 200

| Name     | Type       | Description                           |
|:---------|:-----------|:--------------------------------------|
|  GroupObjectArray | Group[] | <p>Список главных групп (которые не имеют родительских групп) с полной иехрархией всех дочерних групп и блюд</p>|

# <a name='models'></a> Models

## <a name='cart'></a> Cart
[Back to top](#top)

<p>Модель корзины. Имеет в себе список блюд, данные про них, методы для добавления/удаления блюд</p>

	API Cart





### Parameter Parameters

| Name     | Type       | Description                           |
|:---------|:-----------|:--------------------------------------|
|  id | Integer | <p>Уникальный идентификатор</p>|
|  cartId | String | <p>ID корзины, по которой к ней обращается внешнее апи</p>|
|  dishes | CartDish[] | <p>Массив блюд в текущей корзине. Смотри CartDish</p>|
|  countDishes | Integer | <p>Общее количество блюд в корзине (с модификаторами)</p>|
|  uniqueDishes | Integer | <p>Количество уникальных блюд в корзине</p>|
|  cartTotal | Integer | <p>Полная стоимость корзины</p>|
|  delivery | Float | <p>Стоимость доставки</p>|




## <a name='cartdish'></a> CartDish
[Back to top](#top)

<p>Модель блюда в корзине. Содержит информацию о количестве данного блюда в коризне и его модификаторы</p>

	API CartDish





### Parameter Parameters

| Name     | Type       | Description                           |
|:---------|:-----------|:--------------------------------------|
|  id | Integer | <p>ID данного блюда в корзине. Все операции с блюдом в корзине проводить с этим ID</p>|
|  amount | Integer | <p>Количество данного блюда с его модификаторами в корзине</p>|
|  dish | Dish | <p>Само блюдо, которое содержится в корзине</p>|
|  modifiers | JSON | <p>Модификаторы для текущего блюда</p>|
|  cart | Cart | <p>Корзина, в которой находится данное блюдо. Обычно просто ID корзины без модели во избежание рекурсии</p>|
|  parent | CartDish | <p>Родительское блюдо (для модификаторов)</p>|
|  uniqueItems | Integer | <p>Количество уникальных блюд для текущего блюда (учитывая модификаторы)</p>|
|  itemTotal | Integer | <p>Стоимсть данного блюда с модификаторами</p>|

### Param Examples

(JSON)
Модификаторы:

```
{
     "id": "string",
     "amount": "integer",
     "groupId": "string"
}
```



## <a name='dish'></a> Dish
[Back to top](#top)

<p>Модель блюда</p>

	API Dish





### Parameter Parameters

| Name     | Type       | Description                           |
|:---------|:-----------|:--------------------------------------|
|  id | String | <p>Уникальный идентификатор</p>|
|  additionalInfo | String | <p>Дополнительная информация</p>|
|  code | String | <p>Артикул</p>|
|  description | String | <p>Описание</p>|
|  name | String | <p>Название</p>|
|  seoDescription | String | <p>SEO-описание для клиента</p>|
|  seoKeywords | String | <p>SEO-ключевые слова</p>|
|  seoText | String | <p>SEO-текст для роботов</p>|
|  seoTitle | String | <p>SEO-заголовок</p>|
|  carbohydrateAmount | Float | <p>Количество углеводов на 100 г блюда</p>|
|  carbohydrateFullAmount | Float | <p>Количество углеводов в блюде</p>|
|  differentPricesOn | Array | <p>Список терминалов, на которых цена продукта отличается от стандартной и цен на них</p>|
|  doNotPrintInCheque | Boolean | <p>Блюдо не нужно печатать на чеке. Актуально только для модификаторов</p>|
|  energyAmount | Float | <p>Энергетическая ценность на 100 г блюда</p>|
|  energyFullAmount | Float | <p>Энергетическая ценность в блюде</p>|
|  fatAmount | Float | <p>Количество жиров на 100 г блюда</p>|
|  fatFullAmount | Float | <p>Количество жиров в блюде</p>|
|  fiberAmount | Float | <p>Количество белков на 100 г блюда</p>|
|  fiberFullAmount | Float | <p>Количество белков в блюде</p>|
|  groupId | String | <p>Идентификатор группы</p>|
|  groupModifiers | Array | <p>Групповые модификаторы (не используется в пользу modifiers)</p>|
|  measureUnit | String | <p>Единица измерения товара ( кг, л, шт, порц.)</p>|
|  price | Float | <p>Цена</p>|
|  productCategoryId | Group | <p>Идентификатор категории продукта</p>|
|  prohibitedToSaleOn | Array | <p>Список ID терминалов, на которых продукт запрещен к продаже</p>|
|  type | String | <p>Тип: dish - блюдо good - товар modifier - модификатор</p>|
|  useBalanceForSell | Boolean | <p>Товар продается на вес</p>|
|  weight | Float | <p>Вес одной единицы в кг</p>|
|  isIncludedInMenu | Boolean | <p>Нужно ли продукт отображать в дереве номенклатуры</p>|
|  order | Float | <p>Порядок отображения</p>|
|  isDeleted | Boolean | <p>Удалён ли продукт в меню, отдаваемого клиенту</p>|
|  modifiers | JSON | <p>Модификаторы доступные для данного блюда</p>|
|  parentGroup | Group | <p>Группа, к которой принадлежит блюдо</p>|
|  tags | Tags[] | <p>Тэги</p>|
|  balance | Integer | <p>Количество оставшихся блюд. -1 - бесконечно</p>|
|  images | Image[] | <p>Картинки блюда</p>|
|  itemTotal | Integer | |
|  slug | String | <p>Текстовое название блюда в транслите</p>|




## <a name='group'></a> Group
[Back to top](#top)

<p>Группы. Содержат в себе блюда и другие группы</p>

	API Group





### Parameter Parameters

| Name     | Type       | Description                           |
|:---------|:-----------|:--------------------------------------|
|  id | String | <p>Уникальный идентификатор</p>|
|  additionalInfo | String | <p>Дополнительная информация</p>|
|  code | Float | <p>Артикул</p>|
|  description | String | <p>Описание</p>|
|  isDeleted | Boolean | <p>Удалён ли продукт в меню, отдаваемого клиенту</p>|
|  name | String | <p>Название</p>|
|  seoDescription | String | <p>SEO-описание для клиента</p>|
|  seoKeywords | String | <p>SEO-ключевые слова</p>|
|  seoText | String | <p>SEO-текст для роботов</p>|
|  seoTitle | String | <p>SEO-заголовок</p>|
|  tags | Tags | <p>Тэги</p>|
|  isIncludedInMenu | Boolean | <p>Нужно ли продукт отображать в дереве номенклатуры</p>|
|  order | Float | <p>Порядок отображения</p>|
|  dishesTags | Tags[] | <p>Тэги всех блюд, что есть в этой группе</p>|
|  dishes | Dish[] | <p>Блюда, содержашиеся в этой группе</p>|
|  parentGroup | Group | <p>Родительская группа</p>|
|  childGroups | Group[] | <p>Дочерние группы</p>|
|  images | Image[] | <p>Картинки группы</p>|




## <a name='image'></a> Image
[Back to top](#top)

<p>Картинки для блюд или групп</p>

	API Image





### Parameter Parameters

| Name     | Type       | Description                           |
|:---------|:-----------|:--------------------------------------|
|  id | String | <p>ID картинки</p>|
|  images | JSON | <p>Данные о картинках, что содержит данная модель</p>|
|  dish | Dish | <p>Блюдо, которому принадлежит картинка (не показывается во избежание рекурсии)</p>|
|  group | Group | <p>Группа, которой принажлежит картинка (не показывается во избежание рекурсии)</p>|

### Param Examples

(JSON)
images:

```
"images": {
       "origin": "/images/a0f39d7d-75ac-4af1-8e91-d94b442874eb/2039649a-50f9-4785-a7a9-c5f86d637f27/origin.jpg",
       "small": "/images/a0f39d7d-75ac-4af1-8e91-d94b442874eb/2039649a-50f9-4785-a7a9-c5f86d637f27/small.jpg",
       "large": "/images/a0f39d7d-75ac-4af1-8e91-d94b442874eb/2039649a-50f9-4785-a7a9-c5f86d637f27/large.jpg"
   }
```



## <a name='street'></a> Street
[Back to top](#top)

<p>Модель улицы</p>

	API Street





### Parameter Parameters

| Name     | Type       | Description                           |
|:---------|:-----------|:--------------------------------------|
|  id | String | <p>ID улицы</p>|
|  name | String | <p>Название улицы</p>|
|  classifierId | String | <p>Идентификатор улицы в классификаторе, например, КЛАДР.</p>|




## <a name='systeminfo'></a> SystemInfo
[Back to top](#top)

<p>Системная информация (в данный момент ревизия)</p>

	API SystemInfo





### Parameter Parameters

| Name     | Type       | Description                           |
|:---------|:-----------|:--------------------------------------|
|  id | Integer | <p>ID</p>|
|  revision | String | <p>Ревизия меню</p>|
|  revisionStopList | String | <p>Ревизия стоп списка</p>|
|  revisionOrders | String | <p>Ревизия заказов</p>|




## <a name='tags'></a> Tags
[Back to top](#top)

<p>Тэги</p>

	API Tags





### Parameter Parameters

| Name     | Type       | Description                           |
|:---------|:-----------|:--------------------------------------|
|  id | Integer | <p>ID</p>|
|  name | String | <p>Название тэга</p>|
|  dishes | Dish[] | <p>Блюда, которые содержат этот тэг</p>|




# <a name='order'></a> Order

## <a name='проверка-заказа'></a> Проверка заказа
[Back to top](#top)

<p>Проверка возможности создания заказа и получение стоимости доставки</p>

	POST /api/0.5/check





### Parameter Parameters

| Name     | Type       | Description                           |
|:---------|:-----------|:--------------------------------------|
|  cartId | String | <p>ID корзины</p>|
|  comment | String | **optional**<p>Комментарий к заказу</p>|
|  personsCount | Integer | **optional**<p>Количество персон</p>_Default value: 1_<br>|
|  customData | String | **optional**<p>Специальные данные</p>|
|  delivery | JSON | <p>Тип доставки</p>|
|  address | JSON | <p>Адресс доставки</p>|
|  customer | JSON | <p>Информация о заказчике</p>|

### Param Examples

(String)
Смотри &quot;Создание заказа&quot;

```
Смотри "Создание заказа"
```

### Success Response

Message:

```
{
     type: 'info',
     title: 'ok',
     body: 'success'
}
```

### Success 200

| Name     | Type       | Description                           |
|:---------|:-----------|:--------------------------------------|
|  cart | Cart | <p>Коризна с заполненым поле delivery. Если delivery 0, то доставка бесплатная</p>|
|  message | JSON | <p>Сообщение</p>|

### Error Response

ServerError 500

```
{
  message: {
       type: 'error',
       title: 'IIKO problem',
       body: data.problem
     },
     cart: {
       ...
     }
}
```
## <a name='создание-заказа'></a> Создание заказа
[Back to top](#top)

<p>Позволяет создать заказ, который будет создан на IIKO</p>

	POST /api/0.5/order





### Parameter Parameters

| Name     | Type       | Description                           |
|:---------|:-----------|:--------------------------------------|
|  cartId | String | <p>ID корзины</p>|
|  comment | String | **optional**<p>Комментарий к заказу</p>|
|  personsCount | Integer | **optional**<p>Количество персон</p>_Default value: 1_<br>|
|  customData | String | **optional**<p>Специальные данные</p>|
|  delivery | JSON | <p>Тип доставки</p>|
|  address | JSON | <p>Адресс доставки</p>|
|  customer | JSON | <p>Информация о заказчике</p>|

### Param Examples

(JSON)
Minimum order:

```
{
     "cartId": "string",
     "address": {
       "streetId": "string",
       "home": "number",
     },
     "customer": {
       "phone": "string",
       "name": "string"
     }
}
```
(JSON)
Full order:

```
{
     "cartId": "string",
     "comment": "string",
     "delivery": {
       "type": "string (self or nothing)"
     },
     "address": {
       "city": "string",
       "streetId": "string, required",
       "home": "number, required",
       "housing": "string",
       "index": "string",
       "entrance": "string",
       "floor": "string",
       "apartment": "string",
       "doorphone": "string"
     },
     "customer": {
       "phone": "string, required",
       "mail": "string",
       "name": "string, required"
     },
     "personsCount": "number, default 1",
     "customData": "string"
}
```

### Success Response

Message:

```
{
     type: 'info',
     title: 'ok',
     body: 'success'
}
```

### Success 200

| Name     | Type       | Description                           |
|:---------|:-----------|:--------------------------------------|
|  cart | Cart | <p>Новая пустая корзина</p>|
|  message | JSON | <p>Сообщение</p>|

### Error Response

BadRequest 400

```
{
     message: {
       type: 'error',
       title: 'Ошибка валидации',
       body: 'Неверный формат номера!'
}
```
NotFound 400

```
{
     message: {
       type: 'error',
       title: 'not found',
       body: 'Cart with id 0ef473a3-ef9d-746f-d5a5-1a578ad10035 not found'
     }
}
```
Gone 410

```
{
     message: {
       type: 'error',
       title: 'already is complete',
       body: 'Cart with id 0ef473a3-ef9d-746f-d5a5-1a578ad10035 is completed'
     }
}
```
