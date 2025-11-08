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
    // TODO: This needs to be rewritten because if the dish changes, the already sold cart changes. Here we need to store the baked dish.
    // There is an idea that orders need to be baked separately.
    /**The dish that is contained in the cart */
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
    /** Weight */
    weight: "number",
    /** Full weight */
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
