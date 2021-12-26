/**
 * @api {API} OrderDish OrderDish
 * @apiGroup Models
 * @apiDescription Модель блюда в корзине. Содержит информацию о количестве данного блюда в коризне и его модификаторы
 *
 * @apiParam {Integer} id ID данного блюда в корзине. Все операции с блюдом в корзине проводить с этим ID
 * @apiParam {Integer} amount
 * @apiParam {[Dish](#api-Models-ApiDish)} dish
 * @apiParam {JSON} modifiers Модификаторы для текущего блюда
 * @apiParam {[Order](#api-Models-ApiOrder)} order Корзина, в которой находится данное блюдо. Обычно просто ID корзины без модели во избежание рекурсии
 * @apiParam {[OrderDish](#api-Models-ApiOrderdish)} parent Родительское блюдо (для модификаторов)
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
import Order from "../models/Order";
import { Modifier } from "../interfaces/Modifier";
import { Attributes } from "waterline";

let attributes = {
  /** */
  id: {
    type: "number",
    autoIncrement: true,
  } as unknown as number,

  /** Количество данного блюда с его модификаторами в корзине */
  amount: "number" as unknown as number,

  // TODO: Это надо переписать потомучто если меняется блюдо то меняется уже проданная корзина. Здесь надо хранить запеченное блюдо.
  // Есть идея что нужно отдельно запекать заказы.

  /**Само блюдо, которое содержится в корзине */
  dish: {
    model: "Dish",
  } as unknown as Dish | any,

  /** Модификаторы для текущего блюда */
  modifiers: "json" as unknown as Modifier[],

  /** */
  order: {
    model: "Order",
  } as unknown as Order | any,

  /** Количество уникальных блюд в корзине */
  uniqueItems: "number" as unknown as number,

  /** цена позиции */
  itemTotal: "number" as unknown as number,

  /** цена позиции до применения скидок */
  itemTotalBeforeDiscount: "number",

  /** Скидка */
  discount: "json" as unknown as any,

  /**Общая сумма скидки */
  discountTotal: "number" as unknown as number,

  /** Тип скидки */
  discountType: 'string',

  /** Сообщение скидки */
  discountMessage: "string",

  /** Сумма скидки */
  discountAmount: "number",

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
interface OrderDish extends attributes, ORM {}
export default OrderDish;

let Model = {};

module.exports = {
  primaryKey: "id",
  attributes: attributes,
  ...Model,
};

declare global {
  const OrderDish: typeof Model & ORMModel<OrderDish>;
}
