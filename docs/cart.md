# Cart

dishId - id of dish in cart (not guid from original dish)

### Response
Response for all requests is Cart object like that:
~~~json
{
  "id": "integer",
  "cartId": "string",
  "dishes": [
    {
      "amount": "integer",
      "dish": "Dish object",
      "modifiers": "json (current modifiers for this dish)",
      "cart": "integer",
      "parent": "integer (if it is modifier)",
      "uniqueItems": "integer",
      "itemTotal": "integer"
    },
    {"...": ""}
  ],
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






/*
 * @api {put} /api/0.5/cart/add Add dish in cart
 * @apiName Add dish
 * @apiGroup Cart
 * @apiDescription Add dish in cart with modifiers
 *
 *
 * @apiParam {String} [cartId] Id of cart in which add the dish. If not defined create new cart
 * @apiParam {Integer} [amount=1] Amount of dish that add in cart
 * @apiParam {JSON} [modifiers] JSON of modifiers for dish
 * @apiParamExample {JSON} Modifiers example:
 *  {
      "id": "string (required)",
      "amount": "integer (required)",
      "groupId": "string (required for group modifiers)"
 *  }
 *
 * @apiParam {String} dishId Id of dish which add to cart
 *
 * @apiSuccess {JSON} message Message from server
 * @apiSuccess {JSON} cart Cart model
 * @apiSuccessExample {JSON} Message:
 *  {
 *    "type": "info",
 *    "title": "ok",
 *    "body": ""
 *  }
 *
 * @apiErrorExample {JSON} BadRequest 400
 *  {
      "type": "error",
      "title": "bad request",
      "body": {
        "error": "dishId is required"
      }
 *  }
 * @apiErrorExample {JSON} ServerError 500
 *  {
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
 *  }
 * @apiErrorExample {JSON} NotFount 404
 *  {
      "type": "error",
      "title": "not found",
      "body": "Method not found: GET"
 *  }
 */
