/**
 * @api {API} CartDish CartDish
 * @apiGroup Models
 * @apiDescription Модель блюда в корзине. Содержит информацию о количестве данного блюда в коризне и его модификаторы
 *
 * @apiParam {Integer} id ID данного блюда в корзине. Все операции с блюдом в корзине проводить с этим ID
 * @apiParam {Integer} amountКоличество данного блюда с его модификаторами в корзине
 * @apiParam {Dish} dish Само блюдо, которое содержится в корзине
 * @apiParam {JSON} modifiers Модификаторы для текущего блюда
 * @apiParam {Cart} cart Корзина, в которой находится данное блюдо. Обычно просто ID корзины без модели во избежание рекурсии
 * @apiParam {CartDish} parent Родительское блюдо (для модификаторов)
 * @apiParam {Integer} uniqueItems Количество уникальных блюд для текущего блюда (учитывая модификаторы)
 * @apiParam {Integer} itemTotal Стоимсть данного блюда с модификаторами
 * @apiParam {String} comment Комментарий к блюду
 * @apiParam {String} addedBy Указывает каким образом блюдо попало в корзину
 *
 * @apiParamExample {JSON} Модификаторы:
 *  {
      "id": "string",
      "amount": "integer",
      "groupId": "string"
 *  }
 */

module.exports = {

  attributes: {
    id: {
      type: 'integer',
      autoIncrement: true,
      primaryKey: true
    },
    amount: {
      type: 'integer'
    },
    dish: {
      model: 'Dish'
    },
    modifiers: {
      type: 'json'
    },
    cart: {
      model: 'Cart',
      via: 'dishes'
    },
    parent: {
      model: 'CartDish',
      via: 'modifiers'
    },
    uniqueItems: {
      type: 'integer'
    },
    itemTotal: {
      type: 'integer'
    },
    comment: 'string',
    addedBy: {
      type: 'string',
      defaultsTo: 'user'
    }
  }
};

