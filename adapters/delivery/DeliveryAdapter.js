"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class DeliveryAdapter {
    /**
     * Reset order
     * @returns void
     */
    async reset(order) {
        order.delivery = null;
        order.deliveryCost = 0;
        order.deliveryItem = null;
        order.deliveryDescription = '';
    }
}
exports.default = DeliveryAdapter;
