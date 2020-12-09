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

import ORM from "../modelsHelp/ORM";
import Dish from "../models/Dish";
import Modifier from "../modelsHelp/Modifier";
import ORMModel from "../modelsHelp/ORMModel";

module.exports = {
  attributes: {
    id: {
      type: 'integer',
      autoIncrement: true,
      primaryKey: true
    },
    amount: 'integer',
    dish: { // TODO: Это надо переписать потомучто если меняется блюдо то меняется уже проданная корзина. Здесь надо хранить запеченное блюдо.
      model: 'Dish'
    },
    modifiers: 'json',
    cart: {
      model: 'Cart',
      via: 'dishes'
    },
    discount: 'json',
    parent: {
      model: 'CartDish',
      via: 'modifiers'
    },
    uniqueItems: 'integer',
    itemTotal: 'float',
    discountTotal: 'float',
    comment: 'string',
    addedBy: {
      type: 'string',
      defaultsTo: 'user'
    },
    weight: 'float',
    totalWeight: 'float'
  }
};

/**
 * Описывает екзмепляр CartDish, то есть блюда в корзине, имеет связь с корзиной, внутри которой находится и с блюдом,
 * которое описывает
 */
export default interface CartDish extends ORM {
  id: string;
  amount: number;
  dish: Dish;
  modifiers: Modifier[];
  uniqueItems: number;
  itemTotal: number;
  weight: number;
  totalWeight: number;
  comment: string;
  addedBy?: string;
}

/**
 * Описывает класс CartDish, используется для ORM
 */
export interface CartDishModel extends ORMModel<CartDish> {}

declare global {
  const CartDish: CartDishModel;
}
