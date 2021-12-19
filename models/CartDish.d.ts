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
import { Modifier } from "../interfaces/Modifier";
declare let attributes: {
    /** */
    id: number;
    /** Количество данного блюда с его модификаторами в корзине */
    amount: number;
    /**Само блюдо, которое содержится в корзине */
    dish: any;
    /** Модификаторы для текущего блюда */
    modifiers: Modifier[];
    /** */
    cart: any;
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
    /** Коментарий к корзине */
    comment: number;
    /** Метка кто добавил */
    addedBy: string;
    /** Вес */
    weight: number;
    /** Полный вес */
    totalWeight: number;
};
declare type attributes = typeof attributes;
interface CartDish extends attributes, ORM {
}
export default CartDish;
declare let Model: {};
declare global {
    const CartDish: typeof Model & ORMModel<CartDish>;
}
