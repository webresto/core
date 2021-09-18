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

import ORM from "../interfaces/ORM";
import ORMModel from "../interfaces/ORMModel";
import Dish from "../models/Dish";
import Cart from "../models/Cart";
import { Modifier } from "../interfaces/Modifier";
import { Attributes } from "waterline";

let attributes = {
  /** */
  id: {
    type: "number",
    autoIncrement: true,
  } as unknown as string,

  /** Количество данного блюда с его модификаторами в корзине */
  amount: "number" as unknown as number,

  // TODO: Это надо переписать потомучто если меняется блюдо то меняется уже проданная корзина. Здесь надо хранить запеченное блюдо.
  // Есть идея что нужно отдельно запекать заказы.

  /**Само блюдо, которое содержится в корзине */
  dish: {
    model: "Dish",
  } as unknown as Dish | string,

  /** Модификаторы для текущего блюда */
  modifiers: "json" as unknown as Modifier[],

  /** */
  cart: {
    model: "Cart",
  } as unknown as Cart | string,

  /** Количество уникальных блюд в корзине */
  uniqueItems: "number" as unknown as number,

  /** Всего количество блюд */
  itemTotal: "number" as unknown as number,

  /** Скидка */
  discount: "json" as unknown as any,

  /**Общая сумма скидки */
  discountTotal: "number" as unknown as number,

  /** Коментарий к корзине */
  comment: "string" as unknown as number,

  /** Метка кто добавил */
  addedBy: {
    type: "string",
    defaultsTo: "user",
  } as unknown as string,

  /** Вес */
  weight: "number" as unknown as number,

  /** Полный вес */
  totalWeight: "number" as unknown as number,
};

type attributes = typeof attributes;
interface CartDish extends attributes, ORM {}
export default CartDish;

let Model = {};

module.exports = {
  primaryKey: "id",
  attributes: attributes,
  ...Model,
};

declare global {
  const CartDish: typeof Model & ORMModel<CartDish>;
}
