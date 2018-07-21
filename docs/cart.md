# Cart

dishId - id of dish in cart (not guid from original dish)

### Response
Response for all requests is Cart object like that:
~~~json
{
  "id": "integer",
  "cartId": "string",
  "dishes": "array of Dish objects",
  "modifiers": [
    {
      "--for--": "modifiers", 
      "modifierId": "string",
      "maxAmount": "number",
      "minAmount": "number",
      "required": "boolean",
      "defaultAmount": "number",
      "hideIfDefaultAmount": "boolean",
      "dish": "Dish object for this modifier"
    },
    {
      "--for--": "group modifiers",
      "maxAmount": "number",
      "minAmount": "number",
      "modifierId": "string",
      "required": "boolean",
      "childModifiers": "array of modifiers",
      "group": "Group object for this group of modifiers"
    }
  ]
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
