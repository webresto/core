# Cart

dishId - id of dish in cart (not guid from original dish)

### Response
Response for all requests is Cart object like that:
~~~json
{
  "id": "integer",
  "cartId": "string",
  "dishes": "array of Dish objects",
  "modifiers": "array of modifiers"
}
~~~

### Add dish
**Path**: /api/0.5/cart/add \
**Method**: PUT \
**Request body**:
~~~json
{
  "dishId": "string, required",
  "cartId": "string, required",
  "amount": "number, required",
  "modifiers (not required)": [
    {
      "id": "string, required",
      "amount": "integer, required",
      "groupId": "string, required"
    }
  ]
}
~~~


### Delete dish
**Path**: /api/0.5/cart/remove \
**Method**: PUT \
**Request body**:
~~~json
{
  "dishId": "string, required",
  "cartId": "string, required",
  "amount": "number, default 1"
}
~~~


### Set dish count
**Path**: /api/0.5/cart/set \
**Method**: POST  \
**Request body**:
~~~json
{
  "dishId": "string, required",
  "cartId": "string, required",
  "amount": "number"
}
~~~

