import ORM from "../interfaces/ORM";
import ORMModel from "../interfaces/ORMModel";
import { Modifier } from "../interfaces/Modifier";
import { OptionalAll } from "../interfaces/toolsTS";
declare let attributes: {
    /** */
    id: number;
    /** Количество данного блюда с его модификаторами в корзине */
    amount: number;
    /**Блюдо, которое содержится в корзине */
    dish: any;
    /** Selected modifiers */
    modifiers: Modifier[];
    /** */
    order: any;
    /** Количество уникальных блюд в корзине */
    uniqueItems: number;
    /** цена позиции */
    itemTotal: number;
    /** цена позиции до применения скидок */
    itemTotalBeforeDiscount: string;
    /** Скидка */
    discount: any;
    /**Общая сумма скидки */
    discountTotal: number;
    /** Тип скидки */
    discountType: string;
    /** Сообщение скидки */
    discountMessage: string;
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
declare type attributes = typeof attributes;
interface OrderDish extends OptionalAll<attributes>, ORM {
}
export default OrderDish;
declare let Model: {};
declare global {
    const OrderDish: typeof Model & ORMModel<OrderDish>;
}
