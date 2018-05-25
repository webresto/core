# Order
###Checkout
**Path**: /api/0.5/order \
**Method**: POST \
**Request body**: 

~~~JSON
{
  "cartId": "string",       (required)
  "comment": "string",
  "delivery": {
    "type": "string"        ("self" or nothing)
  },
  "address": {
    "city": "string",
    "street": "string",
    "streetId": "string",
    "streetClassifierId": "string",
    "house": "string",
    "housing": "string",
    "index": "string",
    "entrance": "string",
    "floor": "string",
    "apartment": "string"
  },
  "customer": {
    "phone": "string",      (required)
    "mail": "string",       
    "name": "string"        (required)
  }
}
~~~