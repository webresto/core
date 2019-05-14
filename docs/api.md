<a name="top"></a>
# Webresto/core v0.6.0

Sails hook for any cafe based on IIKO

- [Cart](#cart)
	- [Добавить блюдо в корзину](#добавить-блюдо-в-корзину)
	- [Получение корзины](#получение-корзины)
	- [Удаление блюда из корзины](#удаление-блюда-из-корзины)
	- [Поменять комментарий](#поменять-комментарий)
	- [Установить кол-во порций](#установить-кол-во-порций)
	
- [Config](#config)
	- [Конфигурация](#конфигурация)
	
- [Controller](#controller)
	- [Request directly to IIKO api](#request-directly-to-iiko-api)
	- [Получение улиц](#получение-улиц)
	- [Системная информация](#системная-информация)
	
- [Menu](#menu)
	- [Получение отдельного блюда](#получение-отдельного-блюда)
	- [Стоп список](#стоп-список)
	- [Полное меню](#полное-меню)
	- [Получение блюд из группы](#получение-блюд-из-группы)
	
- [Models](#models)
	- [Cart](#cart)
	- [CartDish](#cartdish)
	- [Condition](#condition)
	- [Dish](#dish)
	- [Group](#group)
	- [Image](#image)
	- [Street](#street)
	- [SystemInfo](#systeminfo)
	- [Tags](#tags)
	- [Zone](#zone)
	
- [Order](#order)
	- [Проверка заказа](#проверка-заказа)
	- [Создание заказа](#создание-заказа)
	- [Нахождение зоны](#нахождение-зоны)
	


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
|  dishId | String | <p>ID блюда, которое добавляется в корзину (параметр dishId - поле id из модели <a href="#api-Models-ApiCartdish">CartDish</a>)</p>|
|  comment | String | **optional**<p>Комментарий к блюду</p>|

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
|  cart | <a href="#api-Models-ApiCart">Cart</a> | <p>Cart model</p>|

### Error Response

BadRequest 400

```
{
     "type": "error",
     "title": "bad request",
     "body": "dishId is required"
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
|  cart | <a href="#api-Models-ApiCart">Cart</a> | <p>Cart model</p>|

### Error Response

BadRequest 400

```
{
     "type": "error",
     "title": "bad request",
     "body": "dishId is required"
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
|  dishId | String | <p>Блюдо, которому меняется количество порций (параметр dishId - поле id из модели <a href="#api-Models-ApiCartdish">CartDish</a>)</p>|


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
|  cart | <a href="#api-Models-ApiCart">Cart</a> | <p>Cart model</p>|

### Error Response

BadRequest 400

```
{
     "type": "error",
     "title": "bad request",
     "body": "dishId is required"
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
## <a name='поменять-комментарий'></a> Поменять комментарий
[Back to top](#top)

<p>Установка комментария для блюда в корзине</p>

	POST /api/0.5/cart/setcomment





### Parameter Parameters

| Name     | Type       | Description                           |
|:---------|:-----------|:--------------------------------------|
|  dishId | String | <p>ID блюда, которому меняет комментарий</p>|
|  cartId | String | **optional**<p>ID корзины в которую меняется блюдо. Если не задано, то создаётся новая корзина</p>|
|  comment | String | **optional**<p>Комментарий</p>|


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
|  cart | <a href="#api-Models-ApiCart">Cart</a> | <p>Cart model</p>|

### Error Response

BadRequest 400

```
{
     "type": "error",
     "title": "bad request",
     "body": "dishId is required"
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
|  cart | <a href="#api-Models-ApiCart">Cart</a> | <p>Cart model</p>|

### Error Response

BadRequest 400

```
{
     "type": "error",
     "title": "bad request",
     "body": "dishId is required"
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
|  email | JSON | <p>Настройка e-mail сервера</p>|
|  defaultName | String | **optional**<p>Имя пользоваьеля, что используется при проверки осуществляемости заказа</p>|
|  defaultPhone | String | **optional**<p>Телефон, аналогично предыдущему</p>|
|  iiko | JSON | <p>Параметры для сервера IIKO</p>|
|  images | JSON | **optional**<p>Параметр для обработки картинок блюд. Если его нет, то картнки от IIKO не обрабатываются вовсе. В размерах один из параметров (width или height) обязательный.</p>|
|  dishImagesCount | Number | **optional**<p>Сколько картинок в блюде хранить</p>|
|  groupImages | JSON | **optional**<p>Параметр для обработки картинок групп</p>|
|  groupImagesCount | Number | **optional**<p>Сколько картинок в группе хранить</p>|
|  requireCheckOnRMS | JSON | **optional**<p>Обязательно ли выполнять проверку доставки на RMS-сервере. Если нет, то поставить false, если да, то устанавливается количество попыток проверки</p>|
|  requireSendOnRMS | JSON | **optional**<p>Запрещать оформление заказа без доставки на RMS-сервер. Если нет, то поставить false, если да, то устанавливается количество попыток проверки</p>|
|  checkType | String | **optional**<p>Говорит о том каким образом проверять стоимость доставки (rms - с помощью IIKO, native - встроенной функцией, тогда требуется настройка поля map)</p>|
|  map | JSON | **optional**<p>Настройка для карт если использовать нативную проверку</p>|
|  zoneDontWork | String | **optional**<p>Сообщение в случае, если зона доставки не работает</p>_Default value: Доставка не может быть расчитана_<br>|
|  zoneNotFound | String | **optional**<p>Сообщение в случае, если зона доставки не была найдена</p>_Default value: Улица не входит в зону доставки_<br>|
|  timezone | String | **optional**<p>Временная зона кафе, записывается строкой</p>|

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
(json)
email types

```
{
  server: {
    user: "string",
    password: "string",
    host: "string",
    ssl: "boolean"
  },
  template: "string"
}
```
(json)
email example

```
{
  server: {
    user: "order@restocore",
    password: "password",
    host: "smtp.example.com",
    ssl: true
  },
  template: "/views/email.ejs"
}
```
(json)
requireCheckOnRMS|requireSendOnRMS

```
{
  attempts: 10
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
|  Array | <a href="l#api-Models-ApiStreet">Street</a>[] | <p>Массив улиц</p>|

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
|  DishObject | <a href="#api-Models-ApiDish">Dish</a> | <p>Запрашиваемое блюдо</p>|

## <a name='стоп-список'></a> Стоп список
[Back to top](#top)

<p>Получение стоп списка блюд</p>

	GET /api/0.5/stoplist






### Success 200

| Name     | Type       | Description                           |
|:---------|:-----------|:--------------------------------------|
|  Array | <a href="#api-Models-ApiDish">Dish</a>[] | <p>Список гланых групп (которые не имеют родительских групп) с полной иехрархией всех дочерних групп и блюд</p>|

## <a name='полное-меню'></a> Полное меню
[Back to top](#top)

<p>Получение иерархии меню</p>

	GET /api/0.5/menu






### Success 200

| Name     | Type       | Description                           |
|:---------|:-----------|:--------------------------------------|
|  GroupObjectArray | <a href="#api-Models-ApiGroup">Group</a>[] | <p>Список главных групп (которые не имеют родительских групп) с полной иехрархией всех дочерних групп и блюд</p>|

## <a name='получение-блюд-из-группы'></a> Получение блюд из группы
[Back to top](#top)

<p>Получение заданной группы со всеми её дочерними группами и блюдами</p>

	GET /api/0.5/menu





### Parameter Parameters

| Name     | Type       | Description                           |
|:---------|:-----------|:--------------------------------------|
|  groupId | String | <p>ID группы для получения</p>|
|  groupSlug | String | <p>Slug группы для получения</p>|



### Success 200

| Name     | Type       | Description                           |
|:---------|:-----------|:--------------------------------------|
|  GroupObject | <a href="#api-Models-ApiGroup">Group</a> | <p>Запрашиваемая группа</p>|

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
|  dishes | <a href="#api-Models-ApiCartdish">CartDish</a>[] | <p>Массив блюд в текущей корзине. Смотри <a href="#api-Models-ApiCartdish">CartDish</a></p>|
|  countDishes | Integer | <p>Общее количество блюд в корзине (с модификаторами)</p>|
|  uniqueDishes | Integer | <p>Количество уникальных блюд в корзине</p>|
|  cartTotal | Integer | <p>Полная стоимость корзины</p>|
|  delivery | Float | <p>Стоимость доставки</p>|
|  problem | Boolean | <p>Есть ли проблема с отправкой на IIKO</p>|
|  customer | JSON | <p>Данные о заказчике</p>|
|  address | JSON | <p>Данные о адресе доставки</p>|
|  comment | String | <p>Комментарий к заказу</p>|
|  personsCount | Integer | <p>Количество персон</p>|
|  sendToIiko | Boolean | <p>Был ли отправлен заказ IIKO</p>|
|  iikoId | String | <p>ID заказа, который пришёл от IIKO</p>|
|  deliveryStatus | String | <p>Статус состояния доставки (0 успешно расчитана)</p>|
|  selfDelivery | Boolean | <p>Признак самовывоза</p>|
|  deliveryDescription | String | <p>Строка дополнительной информации о доставке</p>|
|  message | String | <p>Сообщение, что отправляется с корзиной</p>|




## <a name='cartdish'></a> CartDish
[Back to top](#top)

<p>Модель блюда в корзине. Содержит информацию о количестве данного блюда в коризне и его модификаторы</p>

	API CartDish





### Parameter Parameters

| Name     | Type       | Description                           |
|:---------|:-----------|:--------------------------------------|
|  id | Integer | <p>ID данного блюда в корзине. Все операции с блюдом в корзине проводить с этим ID</p>|
|  amount | Integer | <p>Количество данного блюда с его модификаторами в корзине</p>|
|  dish | <a href="#api-Models-ApiDish">Dish</a> | <p>Само блюдо, которое содержится в корзине</p>|
|  modifiers | JSON | <p>Модификаторы для текущего блюда</p>|
|  cart | <a href="#api-Models-ApiCart">Cart</a> | <p>Корзина, в которой находится данное блюдо. Обычно просто ID корзины без модели во избежание рекурсии</p>|
|  parent | <a href="#api-Models-ApiCartdish">CartDish</a> | <p>Родительское блюдо (для модификаторов)</p>|
|  uniqueItems | Integer | <p>Количество уникальных блюд для текущего блюда (учитывая модификаторы)</p>|
|  itemTotal | Integer | <p>Стоимсть данного блюда с модификаторами</p>|
|  comment | String | <p>Комментарий к блюду</p>|
|  addedBy | String | <p>Указывает каким образом блюдо попало в корзину</p>|

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



## <a name='condition'></a> Condition
[Back to top](#top)

<p>Модель условия</p>

	API Condition





### Parameter Parameters

| Name     | Type       | Description                           |
|:---------|:-----------|:--------------------------------------|
|  name | String | <p>Название условия-действия</p>|
|  description | String | <p>Описание условия</p>|
|  enable | Boolean | <p>Включено ли данное условие</p>|
|  weight | Integer | <p>Вес условия, чем больше, тем приоритетнее</p>|
|  causes | JSON | <p>Объект условий, которым необходимо выполниться</p>|
|  actions | JSON | <p>Объект действий, которые выполняются при выполнении всех условий</p>|
|  zones | <a href="#api-Models-ApiZone">Zone</a> | <p>Зоны, к которым применяется данное условие</p>|

### Param Examples

(json)
causes

```
{
  workTime: [
   {
    dayOfWeek: 'monday',
    start: '8:00',
    end: '18:00'
   },
  ],
 cartAmount: {
   valueFrom: 100,
   valueTo: 1000
 },
 dishes: ['some dish id', 'other dish id', ...],
 groups: ['some group id', 'other groups id', ...]
}
```
(json)
actions

```
{
  addDish: {
    dishesId: ['dish id', ...]
  },
  delivery: {
    deliveryCost: 100.00,
    deliveryItem: 'string'
  },
  setDeliveryDescription: {
    description: 'some string'
  },
  reject: true, (отказ доставки)
  setMessage: {
    message: 'string'
  },
  return: true (условия, вес которых ниже даного, игнорируются)
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
|  productCategoryId | <a href="#api-Models-ApiGroup">Group</a> | <p>Идентификатор категории продукта</p>|
|  prohibitedToSaleOn | Array | <p>Список ID терминалов, на которых продукт запрещен к продаже</p>|
|  type | String | <p>Тип: dish - блюдо good - товар modifier - модификатор</p>|
|  useBalanceForSell | Boolean | <p>Товар продается на вес</p>|
|  weight | Float | <p>Вес одной единицы в кг</p>|
|  isIncludedInMenu | Boolean | <p>Нужно ли продукт отображать в дереве номенклатуры</p>|
|  order | Float | <p>Порядок отображения</p>|
|  isDeleted | Boolean | <p>Удалён ли продукт в меню, отдаваемого клиенту</p>|
|  modifiers | JSON | <p>Модификаторы доступные для данного блюда</p>|
|  parentGroup | <a href="#api-Models-ApiGroup">Group</a> | <p>Группа, к которой принадлежит блюдо</p>|
|  tags | JSON | <p>Тэги</p>|
|  balance | Integer | <p>Количество оставшихся блюд. -1 - бесконечно</p>|
|  images | <a href="#api-Models-ApiImage">Image</a>[] | <p>Картинки блюда</p>|
|  itemTotal | Integer | |
|  slug | String | <p>Текстовое названия блюда в транслите</p>|
|  hash | Integer | <p>Хеш данного состояния блюда</p>|

### Param Examples

(JSON)
additionalInfo

```
{
  workTime: [
   {
    dayOfWeek: 'monday',
    start: '8:00',
    end: '18:00'
   },
  ],
  visible: true|false,
  promo: true|false,
  modifier: true|false
}
```



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
|  dishes | <a href="#api-Models-ApiDish">Dish</a>[] | <p>Блюда, содержашиеся в этой группе</p>|
|  parentGroup | <a href="#api-Models-ApiGroup">Group</a> | <p>Родительская группа</p>|
|  childGroups | <a href="#api-Models-ApiGroup">Group</a>[] | <p>Дочерние группы</p>|
|  images | <a href="#api-Models-ApiImage">Image</a>[] | <p>Картинки группы</p>|
|  slug | String | <p>Текстовое названия группы в транслите</p>|

### Param Examples

(JSON)
additionalInfo

```
{
  workTime: [
   {
    dayOfWeek: 'monday',
    start: '8:00',
    end: '18:00'
   },
  ],
  visible: true|false,
  promo: true|false,
  modifier: true|false
}
```



## <a name='image'></a> Image
[Back to top](#top)

<p>Картинки для блюд или групп</p>

	API Image





### Parameter Parameters

| Name     | Type       | Description                           |
|:---------|:-----------|:--------------------------------------|
|  id | String | <p>ID картинки</p>|
|  images | JSON | <p>Данные о картинках, что содержит данная модель</p>|
|  dish | <a href="#api-Models-ApiDish">Dish</a> | <p>Блюдо, которому принадлежит картинка (не показывается во избежание рекурсии)</p>|
|  group | <a href="#api-Models-ApiGroup">Group</a> | <p>Группа, которой принажлежит картинка (не показывается во избежание рекурсии)</p>|

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
|  isDeleted | Boolean | <p>Удалена ли улица</p>|




## <a name='systeminfo'></a> SystemInfo
[Back to top](#top)

<p>Системная информация (в данный момент ревизия)</p>

	API SystemInfo





### Parameter Parameters

| Name     | Type       | Description                           |
|:---------|:-----------|:--------------------------------------|
|  id | Integer | <p>ID</p>|
|  key | String | <p>Ключ доступа к свойству</p>|
|  value | String | <p>Значение свойства</p>|
|  section | String | <p>Секция, к которой относится свойство</p>|




## <a name='tags'></a> Tags
[Back to top](#top)

<p>Тэги</p>

	API Tags





### Parameter Parameters

| Name     | Type       | Description                           |
|:---------|:-----------|:--------------------------------------|
|  id | Integer | <p>ID</p>|
|  name | String | <p>Название тэга</p>|
|  dishes | <a href="#api-Models-ApiDish">Dish</a>[] | <p>Блюда, которые содержат этот тэг</p>|




## <a name='zone'></a> Zone
[Back to top](#top)

<p>Модель зоны. Связана с условиями</p>

	API Zone





### Parameter Parameters

| Name     | Type       | Description                           |
|:---------|:-----------|:--------------------------------------|
|  name | String | <p>Название</p>|
|  description | String | <p>Описание</p>|
|  polygons | JSON | <p>Массив точек полигона</p>|




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
|  cart | <a href="#api-Models-ApiCart">Cart</a> | <p>Коризна с заполненым поле delivery. Если delivery 0, то доставка бесплатная</p>|
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
|  cart | <a href="#api-Models-ApiCart">Cart</a> | <p>Новая пустая корзина</p>|
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
## <a name='нахождение-зоны'></a> Нахождение зоны
[Back to top](#top)

<p>Нахождение зоны, в которую входит адресс</p>

	POST /api/0.5/delivery





### Parameter Parameters

| Name     | Type       | Description                           |
|:---------|:-----------|:--------------------------------------|
|  streetId | String | <p>Улица доставки</p>|
|  home | Integer | <p>Дом доставки</p>|



### Success 200

| Name     | Type       | Description                           |
|:---------|:-----------|:--------------------------------------|
|  Array | String[] | <p>Список описаний условий, что принадлежат этой зоне</p>|

