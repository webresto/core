# Menu
### Get dish
~~~
/api/0.5/menu 
~~~

**Method**: GET 

**Params**(one of three): 
- dishId (string)
- slug (string)

**Response**:
Dish object

### Get dishes by group id
~~~
/api/0.5/menu 
~~~

**Method**: GET 

**Params**:
- groupId (string)
- nothing (return all groups)

**Response**:
~~~JSON
{
  "groupId1": "Group object",
  "groupId2": "Group object",
  "...": "..."
}
~~~
or
~~~JSON
{
  "Dish object": "dish fields"
}
~~~

### Get groups without objects
~~~
/api/0.5/groups 
~~~
**Method**: GET 

**Params**:
- groupId (string)
- nothing (return all groups)

**Response**:
~~~JSON
{
  "groupId1": "Group object",
  "groupId2": "Group object",
  "...": "..."
}
~~~
