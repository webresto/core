<a name="top"></a>
# @sails-resto/core v0.5.2

Sails hook for any cafe based on IIKO

- [Cart](#cart)
	- [Add dish in cart](#add-dish-in-cart)
	
- [Controller](#controller)
	- [Request directly to IIKO api](#request-directly-to-iiko-api)
	
- [Models](#models)
	- [Cart](#cart)
	- [CartDish](#cartdish)
	- [Dish](#dish)
	- [Group](#group)
	- [Image](#image)
	- [Street](#street)
	- [SystemInfo](#systeminfo)
	- [Tags](#tags)
	


# <a name='cart'></a> Cart

## <a name='add-dish-in-cart'></a> Add dish in cart
[Back to top](#top)

<p>Add dish in cart with modifiers</p>

	PUT /api/0.5/cart/add





### Parameter Parameters

| Name     | Type       | Description                           |
|:---------|:-----------|:--------------------------------------|
|  cartId | String | **optional**<p>Id of cart in which add the dish. If not defined create new cart</p>|
|  amount | Integer | **optional**<p>Amount of dish that add in cart</p>_Default value: 1_<br>|
|  modifiers | JSON | **optional**<p>JSON of modifiers for dish</p>|
|  dishId | String | <p>Id of dish which add to cart</p>|

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
  type: "info",
  "title": "ok",
  "body": ""
}
```
dishes:

```
[
{
       "amount": "integer",
       "dish": "Dish model",
       "modifiers": "json (current modifiers for this dish)",
       "cart": "integer",
       "parent": "integer (if it is modifier)",
       "id": "integer"
     }
]
```

### Success 200

| Name     | Type       | Description                           |
|:---------|:-----------|:--------------------------------------|
|  message | JSON | <p>Message from server</p>|
|  cart | JSON | <p>Cart model</p>|
|  id | String | <p>Id of cart from database (unused for front)</p>|
|  cartId | String | <p>If of cart from cartId param or id created cart</p>|
|  dishes | JSON | <p>Array of dishes in cart</p>|

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

# <a name='models'></a> Models

## <a name='cart'></a> Cart
[Back to top](#top)

<p>Модель корзины. Имеет в себе список блюд, данные про них, методы для добавления/удаления блюд</p>

	API Cart





### Parameter Parameters

| Name     | Type       | Description                           |
|:---------|:-----------|:--------------------------------------|
|  id | Integer | <p>ID корзины в БД</p>|
|  cartId | String | <p>ID корзины, по которой к ней обращается внешнее апи</p>|
|  dishes | [CartDish] | <p>Массив блюд в текущей корзине. Смотри CartDish</p>|
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
|  tags | [Tags] | <p>Тэги</p>|
|  balance | Integer | <p>Количество оставшихся блюд. -1 - бесконечно</p>|
|  images | [Image] | <p>Картинки блюда</p>|
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
|  dishesTags | [Tags] | <p>Тэги всех блюд, что есть в этой группе</p>|
|  dishes | [Dish] | <p>Блюда, содержашиеся в этой группе</p>|
|  parentGroup | Group | <p>Родительская группа</p>|
|  childGroups | [Group] | <p>Дочерние группы</p>|
|  images | [Image] | <p>Картинки группы</p>|




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
|  dishes | [Dish] | <p>Блюда, которые содержат этот тэг</p>|




