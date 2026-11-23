import ORM from "../interfaces/ORM";
import { ORMModel } from "../interfaces/ORMModel";
import { OrderModifier } from "../interfaces/Modifier";
import { OptionalAll, RequiredField } from "../interfaces/toolsTS";
import { DishRecord } from "./Dish";
import { OrderRecord } from "./Order";
import { PlaceRecord } from "./Place";
declare let attributes: {
    /** */
    id: number;
    /** Quantity of this dish with its modifiers in the cart */
    amount: number;
    /**The dish that is contained in the cart */
    /** any problem */
    dish: DishRecord | string;
    /**
     * The box of the line's dish, when that dish is a variant (`interfaces/Variants.ts`); `null`
     * for an ordinary dish.
     *
     * `dish` is the variant and not the box: the price, the weight, the stock, the cash register
     * and the merging of equal lines all read `dish`, and with a box there each of them would be
     * wrong silently — a price of 0, two sizes in one line. The box is kept for history and display.
     */
    parentDish: DishRecord | string | null;
    /** Selected modifiers */
    modifiers: OrderModifier[];
    /** */
    order: OrderRecord | string;
    /** Position price*/
    itemTotal: number;
    /** Position price before the use of discounts */
    itemTotalBeforeDiscount: number;
    /** Price for product */
    itemPrice: number;
    /**The total amount of the discount */
    discountTotal: number;
    /** Type discount */
    discountType: string;
    discountId: string;
    discountDebugInfo: string;
    discountAmount: number;
    /** postDiscounts */
    discountMessage: string;
    /** Comment to dish in order */
    comment: string;
    /** The label who added */
    addedBy: string;
    /** Weight */
    weight: number;
    /** Full weight */
    totalWeight: number;
    /**
     * The kitchen cooking this one line.
     *
     * `null` on every order that is not routed across several kitchens, which is
     * every order until a router module is installed and `MENU_PLACE_BASED_MODE`
     * names it. A line with none is cooked at the order's first `cookingPoints`;
     * a routed line carries the stop the route gave it.
     *
     * A line rather than a derived lookup because a route is a decision, not a
     * calculation: re-deriving "which kitchen has this product" at read time would
     * give a different answer the moment stock moves, and a kitchen that has
     * already been told to cook something must not change its mind because a
     * balance ticked over.
     */
    cookingPoint: PlaceRecord | string | null;
};
type attributes = typeof attributes;
export interface OrderDishRecord extends RequiredField<OptionalAll<attributes>, "dish" | "amount">, ORM {
}
declare let Model: {
    afterCreate(newRecord: OrderDishRecord, proceed: () => void): void;
    afterUpdate(newRecord: OrderDishRecord, proceed: () => void): void;
};
declare global {
    const OrderDish: typeof Model & ORMModel<OrderDishRecord, "dish" | "amount">;
}
export {};
