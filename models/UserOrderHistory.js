"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
let attributes = {
    /** ID */
    id: {
        type: "string",
        //required: true,
    },
    /** Number of unique dishes in the cart */
    uniqueItems: "number",
    /** Total cost of the order */
    orderTotal: "number",
    /** total cost */
    total: "number",
    /** Baked json object of fullOrder */
    order: "json",
    /** Total discount amount*/
    discountTotal: "number",
    /** Comment to dish in order */
    comment: "string",
    /** Gross weight */
    totalWeight: "number",
    user: {
        model: 'user',
        required: true
    },
};
let Model = {
    async save(orderId) {
        let order = await Order.populate({ id: orderId });
        if (!order)
            throw 'no order for save';
        if (!order.user)
            throw 'No user for save order';
        let user = await User.findOne({ id: order.user });
        if (user && user.id) {
            await UserOrderHistory.create({
                id: (0, uuid_1.v4)(),
                order: OrderRecordRecord,
                orderTotal: order.orderTotal,
                uniqueItems: order.uniqueDishes,
                total: order.total,
                totalWeight: order.totalWeight,
                user: user.id
            }).fetch();
        }
        // Count orders
        let count = await UserOrderHistory.find({ user: user.id });
        await User.update({ id: user.id }, { orderCount: count.length }).fetch();
    }
};
module.exports = {
    primaryKey: "id",
    attributes: attributes,
    ...Model,
};
