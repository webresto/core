import ORM from "../interfaces/ORM";
import { ORMModel } from "../interfaces/ORMModel";

import Dish from "../models/Dish";
import Order from "../models/Order";
import { Modifier, OrderModifier } from "../interfaces/Modifier";
import { OptionalAll, RequiredField } from "../interfaces/toolsTS";

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

  /**Блюдо, которое содержится в корзине */
  /** any problem */
  dish: {
    model: "Dish",
  } as unknown as Dish | any,
  
  /** Selected modifiers */
  modifiers: "json" as unknown as OrderModifier[],

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

  /**Общая сумма скидки */
  discountTotal: "number" as unknown as number,

  /** Тип скидки */
  discountType: 'string',

  /** Сумма скидки */
  discountAmount: "number",

  /** Comment to dish in order */
  comment: "string",

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
interface OrderDish extends RequiredField<OptionalAll<attributes>, "dish" | "amount" >, ORM {}
export default OrderDish;

let Model = {};

module.exports = {
  primaryKey: "id",
  attributes: attributes,
  ...Model,
};

declare global {
  const OrderDish: typeof Model & ORMModel<OrderDish, "dish" | "amount">;
}
