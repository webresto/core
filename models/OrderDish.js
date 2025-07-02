"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
let attributes = {
    /** */
    id: {
        type: "number",
        autoIncrement: true,
    },
    /** Quantity of this dish with its modifiers in the cart */
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
    /** Position price*/
    itemTotal: "number",
    /** Position price before the use of discounts */
    itemTotalBeforeDiscount: "number",
    /** Price for product */
    itemPrice: "number",
    /**The total amount of the discount */
    discountTotal: "number",
    /** Type discount */
    discountType: {
        type: "string",
        isIn: ["percentage", "flat"],
        allowNull: true
    },
    discountId: {
        type: "string",
        allowNull: true
    },
    discountDebugInfo: {
        type: "string",
        allowNull: true
    },
    discountAmount: "number",
    /** postDiscounts */
    discountMessage: {
        type: "string",
        allowNull: true
    },
    /** Comment to dish in order */
    comment: "string",
    /** The label who added */
    addedBy: {
        type: "string",
        defaultsTo: "user", // promotion
    },
    /** Вес */
    weight: "number",
    /** Полный вес */
    totalWeight: "number",
};
let Model = {
    afterCreate(newRecord, proceed) {
        emitter.emit("core:order-dish-changed", newRecord);
        return proceed();
    },
    afterUpdate(newRecord, proceed) {
        emitter.emit("core:order-dish-changed", newRecord);
        return proceed();
    },
};
module.exports = {
    primaryKey: "id",
    attributes: attributes,
    ...Model,
};
