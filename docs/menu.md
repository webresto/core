# Menu
### Get dish
**Path**: /api/0.5/menu \
**Method**: GET \
**Params**:
- dishId (string)

**Response**:
Dish object

### Get dishes by group id
**Path**: /api/0.5/menu \
**Method**: GET \
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
