"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class AbstractPromotionAdapter {
    // public static clearOfPromotion:(orderId: any) => Promise<void>;
    static async clearOfPromotion(orderId) {
        const order = await Order.findOne({ id: orderId });
        // if Order.status ="PAYMENT" or "ORDER" can't clear promotions
        if (order.state === "ORDER")
            throw "order with orderId " + order.id + "in state ORDER";
        if (order.state === "PAYMENT")
            throw "order with orderId " + order.id + "in state PAYMENT";
        // ------------------------------------------ OrderDish update ------------------------------------------
        const orderDishes = await OrderDish.find({ order: order.id }).populate("dish");
        for (const orderDish of orderDishes) {
            await OrderDish.update({ id: orderDish.id }, { discountTotal: 0, discountType: "" }).fetch();
        }
        await Order.updateOne({ id: order.id }, { discountTotal: 0 }); // isPromoting: false
    }
}
exports.default = AbstractPromotionAdapter;
