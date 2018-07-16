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
~~~
/api/0.5/cart/add 
~~~
**Method**: PUT 

**Request body**:
~~~json
{
  "dishId": "string (required)",
  "cartId": "string (required)",
  "amount": "number (default 1)",
  "modifiers (not required)": [
    {
      "id": "string (required)",
      "amount": "integer (required)",
      "groupId": "string (required for group modifiers)"
    }
  ]
}
~~~


### Delete dish
~~~
/api/0.5/cart/remove 
~~~
**Method**: PUT 

**Request body**:
~~~json
{
  "dishId": "string (required)",
  "cartId": "string (required)",
  "amount": "number (default 1)"
}
~~~


### Set dish count
~~~
/api/0.5/cart/set 
~~~

**Method**: POST  

**Request body**:
~~~json
{
  "dishId": "string, required",
  "cartId": "string, required",
  "amount": "number"
}
~~~
