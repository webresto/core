"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
let attributes = {
    /** */
    id: {
        type: "number",
        autoIncrement: true,
    },
    /** Количество данного блюда с его модификаторами в корзине */
    amount: "number",
    // TODO: Это надо переписать потомучто если меняется блюдо то меняется уже проданная корзина. Здесь надо хранить запеченное блюдо.
    // Есть идея что нужно отдельно запекать заказы.
    /**Блюдо, которое содержится в корзине */
    /** any problem */
    dish: {
        model: "Dish",
    },
    /** Selected modifiers */
    modifiers: "json",
    /** */
    order: {
        model: "Order",
    },
    /** The number of unique dishes in the basket */
    uniqueItems: "number",
    /** Position price*/
    itemTotal: "number",
    /** Position price before the use of discounts */
    itemTotalBeforeDiscount: "number",
    /**The total amount of the discount */
    discountTotal: "number",
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
        defaultsTo: "user",
    },
    /** Вес */
    weight: "number",
    /** Полный вес */
    totalWeight: "number",
};
let Model = {};
module.exports = {
    primaryKey: "id",
    attributes: attributes,
    ...Model,
};
