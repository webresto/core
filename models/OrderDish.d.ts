import ORM from "../interfaces/ORM";
import { ORMModel } from "../interfaces/ORMModel";
import { OrderModifier } from "../interfaces/Modifier";
import { OptionalAll, RequiredField } from "../interfaces/toolsTS";
declare let attributes: {
    /** */
    id: number;
    /** Количество данного блюда с его модификаторами в корзине */
    amount: number;
    /**Блюдо, которое содержится в корзине */
    /** any problem */
    dish: any;
    /** Selected modifiers */
    modifiers: OrderModifier[];
    /** */
    order: any;
    /** Количество уникальных блюд в корзине */
    uniqueItems: number;
    /** цена позиции */
    itemTotal: number;
    /** цена позиции до применения скидок */
    itemTotalBeforeDiscount: string;
    /**Общая сумма скидки */
    discountTotal: number;
    /** Тип скидки */
    discountType: string;
    /** Сумма скидки */
    discountAmount: string;
    /** Comment to dish in order */
    comment: string;
    /** Метка кто добавил */
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
