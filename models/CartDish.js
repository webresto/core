"use strict";
/**
 * @api {API} CartDish CartDish
 * @apiGroup Models
 * @apiDescription Модель блюда в корзине. Содержит информацию о количестве данного блюда в коризне и его модификаторы
 *
 * @apiParam {Integer} id ID данного блюда в корзине. Все операции с блюдом в корзине проводить с этим ID
 * @apiParam {Integer} amount Количество данного блюда с его модификаторами в корзине
 * @apiParam {[Dish](#api-Models-ApiDish)} dish Само блюдо, которое содержится в корзине
 * @apiParam {JSON} modifiers Модификаторы для текущего блюда
 * @apiParam {[Cart](#api-Models-ApiCart)} cart Корзина, в которой находится данное блюдо. Обычно просто ID корзины без модели во избежание рекурсии
 * @apiParam {[CartDish](#api-Models-ApiCartdish)} parent Родительское блюдо (для модификаторов)
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
Object.defineProperty(exports, "__esModule", { value: true });
module.exports = {
    attributes: {
        id: {
            type: 'integer',
            autoIncrement: true,
            primaryKey: true
        },
        amount: 'integer',
        dish: {
            model: 'Dish'
        },
        modifiers: 'json',
        cart: {
            model: 'Cart'
        },
        discount: 'json',
        uniqueItems: 'integer',
        itemTotal: 'float',
        itemTotalBeforeDiscount: 'float',
        discountTotal: 'float',
        discountMessage: 'string',
        discountType: 'string',
        comment: 'string',
        addedBy: {
            type: 'string',
            defaultsTo: 'user'
        },
        weight: 'float',
        totalWeight: 'float'
    }
};
