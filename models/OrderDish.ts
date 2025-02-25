import ORM from "../interfaces/ORM";
import { ORMModel } from "../interfaces/ORMModel";

// todo: fix types model instance to {%ModelName%}Record for Order";
import { OrderModifier } from "../interfaces/Modifier";
import { OptionalAll, RequiredField } from "../interfaces/toolsTS";
import { DishRecord } from "./Dish";
import { OrderRecord } from "./Order";

let attributes = {
  /** */
  id: {
    type: "number",
    autoIncrement: true,
  } as unknown as number,

  /** Quantity of this dish with its modifiers in the cart */
  amount: "number" as unknown as number,

  // TODO: Это надо переписать потомучто если меняется блюдо то меняется уже проданная корзина. Здесь надо хранить запеченное блюдо.
  // Есть идея что нужно отдельно запекать заказы.

  /**Блюдо, которое содержится в корзине */
  /** any problem */
  dish: {
    model: "Dish",
  } as unknown as DishRecord | string,
  
  /** Selected modifiers */
  modifiers: "json" as unknown as OrderModifier[],

  /** */
  order: {
    model: "Order",
  } as unknown as OrderRecord | string,

  /** Position price*/
  itemTotal: "number" as unknown as number,

  /** Position price before the use of discounts */
  itemTotalBeforeDiscount: "number" as unknown as number,

  /** Price for product */
  itemPrice: "number" as unknown as number,

  /**The total amount of the discount */
  discountTotal: "number" as unknown as number,

  /** Type discount */
  discountType: {
    type: "string",
    isIn: ["percentage", "flat"],
    allowNull: true
  } as unknown as string,

  discountId: {
    type: "string",
    allowNull: true
  } as unknown as string,

  discountDebugInfo: {
    type: "string",
    allowNull: true
  } as unknown as string,

  discountAmount: "number" as unknown as number,

  /** postDiscounts */
  discountMessage: {
    type: "string",
    allowNull: true
  } as unknown as string,

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
/**
 * @deprecated use `OrderDishRecord` instead
 */
interface OrderDish extends RequiredField<OptionalAll<attributes>, "dish" | "amount" >, ORM {}

export interface OrderDishRecord extends RequiredField<OptionalAll<attributes>, "dish" | "amount" >, ORM {}

let Model = {
};

module.exports = {
  primaryKey: "id",
  attributes: attributes,
  ...Model,
};

declare global {
  const OrderDish: typeof Model & ORMModel<OrderDishRecord, "dish" | "amount">;
}
