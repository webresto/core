import ORM from "../interfaces/ORM";
import { ORMModel } from "../interfaces/ORMModel";
import Dish from "../models/Dish";
import Order from "../models/Order";
import { OrderModifier } from "../interfaces/Modifier";
import { OptionalAll, RequiredField } from "../interfaces/toolsTS";
declare let attributes: {
    /** */
    id: number;
    /** Quantity of this dish with its modifiers in the cart */
    amount: number;
    /**Блюдо, которое содержится в корзине */
    /** any problem */
    dish: Dish | string;
    /** Selected modifiers */
    modifiers: OrderModifier[];
    /** */
    order: Order | any;
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
    /** Вес */
    weight: number;
    /** Полный вес */
    totalWeight: number;
};
type attributes = typeof attributes;
interface OrderDish extends RequiredField<OptionalAll<attributes>, "dish" | "amount">, ORM {
}
export default OrderDish;
declare let Model: {};
declare global {
    const OrderDish: typeof Model & ORMModel<OrderDish, "dish" | "amount">;
}
