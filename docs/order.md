# Order
###Checkout
~~~
/api/0.5/order 
~~~
**Method**: POST 

**Request body**: 

~~~json
{
  "cartId": "string, (required)",
  "comment": "string",
  "delivery": {
    "type": "string (self or nothing)"
  },
  "address": {
    "city": "string",
    "streetId": "string, required",
    "home": "string, required",
    "housing": "string",
    "index": "string",
    "entrance": "string",
    "floor": "string",
    "apartment": "string"
  },
  "customer": {
    "phone": "string, required",
    "mail": "string",       
    "name": "string, required"
  },
  "personsCount": "number, default 1"
}
~~~
