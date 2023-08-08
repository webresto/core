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
    /** Количество уникальных блюд в корзине */
    uniqueItems: "number",
    /** цена позиции */
    itemTotal: "number",
    /** цена позиции до применения скидок */
    itemTotalBeforeDiscount: "number",
    /**Общая сумма скидки */
    discountTotal: "number",
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
