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
  } as unknown as Dish | string,
  
  /** Selected modifiers */
  modifiers: "json" as unknown as OrderModifier[],

  /** */
  order: {
    model: "Order",
  } as unknown as Order | any,

  /** The number of unique dishes in the basket */
  uniqueItems: "number" as unknown as number,

  /** Position price*/
  itemTotal: "number" as unknown as number,

  /** Position price before the use of discounts */
  itemTotalBeforeDiscount: "number",

  /**The total amount of the discount */
  discountTotal: "number" as unknown as number,

  /** Type discount */
  discountType: 'string',

  /** Discount amount 
   * "percentage" | "flat"
   * 
  */
  discountAmount: "number",

  /** postDiscounts */
  discountMessage: "string",

  /** Comment to dish in order */
  comment: "string",

  /** The label who added */
  addedBy: {
    type: "string",
    defaultsTo: "user", // promotion
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
