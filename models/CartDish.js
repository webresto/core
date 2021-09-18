"use strict";
/**
 * @api {API} CartDish CartDish
 * @apiGroup Models
 * @apiDescription Модель блюда в корзине. Содержит информацию о количестве данного блюда в коризне и его модификаторы
 *
 * @apiParam {Integer} id ID данного блюда в корзине. Все операции с блюдом в корзине проводить с этим ID
 * @apiParam {Integer} amount
 * @apiParam {[Dish](#api-Models-ApiDish)} dish
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
let attributes = {
    /** */
    id: {
        type: "number",
        autoIncrement: true,
    },
    /** Количество данного блюда с его модификаторами в корзине */
    amount: "number",
    // TODO: Это надо переписать потомучто если меняется блюдо то меняется уже проданная корзина. Здесь надо хранить запеченное блюдо.
    // Есть идея что нужно отдельно запекать заказы.
    /**Само блюдо, которое содержится в корзине */
    dish: {
        model: "Dish",
    },
    /** Модификаторы для текущего блюда */
    modifiers: "json",
    /** */
    cart: {
        model: "Cart",
    },
    /** Количество уникальных блюд в корзине */
    uniqueItems: "number",
    /** Всего количество блюд */
    itemTotal: "number",
    /** Скидка */
    discount: "json",
    /**Общая сумма скидки */
    discountTotal: "number",
    /** Коментарий к корзине */
    comment: "string",
    /** Метка кто добавил */
    addedBy: {
        type: "string",
        defaultsTo: "user",
    },
    /** Вес */
    weight: "number",
    /** Полный вес */
    totalWeight: "number",
};
;
let Model = {};
module.exports = {
    primaryKey: "id",
    attributes: attributes,
    ...Model,
};
