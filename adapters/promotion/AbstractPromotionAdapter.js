"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class AbstractPromotionAdapter {
    /**
     * Base realization clearOfPromotion
     * the order attribute will be changed during method execution
     *
     * This is in an abstract class because it's essentially part of the core, but you can rewrite it
     */
    async clearOfPromotion(order) {
        // if Order.status ="PAYMENT" or "ORDER" can't clear promotions
        if (order.state === "ORDER")
            throw `order with orderId ${order.id} in state ORDER`;
        //if (order.state === "PAYMENT") throw "order with orderId" + order.id + "in state PAYMENT";
        // const orderDishes = await OrderDish.find({ order: order.id }).populate("dish");
        await OrderDish.destroy({ order: order.id, addedBy: "promotion" }).fetch();
        await OrderDish.update({ order: order.id }, { discountTotal: 0, discountType: null, discountAmount: 0, discountMessage: null }).fetch();
        await Order.updateOne({ id: order.id }, { discountTotal: 0, promotionFlatDiscount: 0 });
        let dishes = order.dishes ? order.dishes : [];
        dishes.forEach((orderItem) => {
            orderItem.discountTotal = 0,
                orderItem.discountType = null,
                orderItem.discountAmount = 0,
                orderItem.discountMessage = null;
        });
        order.promotionState = [];
        order.promotionDelivery = null;
        order.promotionUnorderable = false;
        order.dishes = dishes;
        order.discountTotal = 0;
        order.promotionFlatDiscount = 0;
        order.promotionDelivery = null;
        return order;
    }
}
exports.default = AbstractPromotionAdapter;
