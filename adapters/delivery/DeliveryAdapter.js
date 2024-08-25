"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class DeliveryAdapter {
    /**
     * Reset order
     * @returns void
     */
    async reset(order) {
        order.delivery = {
            deliveryTimeMinutes: 0,
            allowed: false,
            cost: null,
            item: undefined,
            message: 'Shipping cost will be calculated'
        };
        order.deliveryCost = 0;
        order.deliveryItem = null;
        order.deliveryDescription = '';
    }
}
exports.default = DeliveryAdapter;
