# Cart

### Response
Response for all requests is Cart object like that:
~~~json
{
  "id": "integer",
  "userId": "string",
  "dishes": "array of Dish objects"
}
~~~

### Add dish
**Path**: /api/0.5/cart \
**Method**: PUT \
**Request body**:
~~~json
{
  "dishId": "string, required",
  "cartId": "string, required",
  "amount": "number, required",
  "modifiers": [
    {
      "modifierId": "string, required",
      "amount": "integer, defaults 1"
    }
  ]
}
~~~


### Delete dish
**Path**: /api/0.5/cart \
**Method**: DELETE \
**Params**:
~~~json
{
  "dishId": "string, required",
  "userId": "string, required",
  "amount": "number, default 1"
}
~~~


### Add dish modifier
**Path**: /api/0.5/cart \
**Method**: PUT \
**Request body**:
~~~json
{
  "dishId": "string, required",
  "cartId": "string, required",
  "modifiers": [
    {
      "modifierId": "string, required",
      "amount": "integer, defaults 1"
    }
  ]
}
~~~
If add modifier to dish that not exists, dish will be created with amount 1


### Remove dish modifier
**Path**: /api/0.5/cart \
**Method**: DELETE  \
**Params**:
~~~json
{
  "dishId": "string, required",
  "modifierId": "string, required",
  "userId": "string, required",
  "amount": "number, default 1"
}
~~~
