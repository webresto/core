import ORM from "../interfaces/ORM";
import { ORMModel } from "../interfaces/ORMModel";

// todo: fix types model instance to {%ModelName%}Record for Order";
import { OrderModifier } from "../interfaces/Modifier";
import { OptionalAll, RequiredField } from "../interfaces/toolsTS";
import { DishRecord } from "./Dish";
import { OrderRecord } from "./Order";
import { PlaceRecord } from "./Place";

let attributes = {
  /** */
  id: {
    type: "number",
    autoIncrement: true,
  } as unknown as number,

  /** Quantity of this dish with its modifiers in the cart */
  amount: "number" as unknown as number,

  // TODO: This needs to be rewritten because if the dish changes, the already sold cart changes. Here we need to store the baked dish.
  // There is an idea that orders need to be baked separately.

  /**The dish that is contained in the cart */
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

  /** Weight */
  weight: "number" as unknown as number,

  /** Full weight */
  totalWeight: "number" as unknown as number,

  /**
   * The kitchen cooking this one line.
   *
   * `null` on every order that is not routed across several kitchens, which is
   * every order until a router module is installed and `MENU_PLACE_BASED_MODE`
   * names it. The order's own `cookingPoint` still says where the order is
   * cooked; this says it per line, and the two agree whenever a route has one
   * stop.
   *
   * A line rather than a derived lookup because a route is a decision, not a
   * calculation: re-deriving "which kitchen has this product" at read time would
   * give a different answer the moment stock moves, and a kitchen that has
   * already been told to cook something must not change its mind because a
   * balance ticked over.
   */
  cookingPoint: {
    model: "Place",
  } as unknown as PlaceRecord | string | null,
};

type attributes = typeof attributes;
/**
 * @deprecated use `OrderDishRecord` instead
 */
interface OrderDish extends RequiredField<OptionalAll<attributes>, "dish" | "amount" >, ORM {}

export interface OrderDishRecord extends RequiredField<OptionalAll<attributes>, "dish" | "amount" >, ORM {}

let Model = {
  afterCreate(newRecord: OrderDishRecord, proceed: () => void) {
    emitter.emit("core:order-dish-changed", newRecord);
    return proceed();
  },

  afterUpdate(newRecord: OrderDishRecord, proceed: () => void) {
    emitter.emit("core:order-dish-changed", newRecord);
    return proceed();
  },
};

module.exports = {
  primaryKey: "id",
  attributes: attributes,
  ...Model,
};

declare global {
  const OrderDish: typeof Model & ORMModel<OrderDishRecord, "dish" | "amount">;
}
