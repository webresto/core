"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultDeliveryAdapter = void 0;
const DeliveryAdapter_1 = require("../DeliveryAdapter");
class DefaultDeliveryAdapter extends DeliveryAdapter_1.default {
    async calculate(order) {
        const deliveryCost = await Settings.get("DELIVERY_COST");
        const deliveryItem = await Settings.get("DELIVERY_ITEM");
        const deliveryMessage = await Settings.get("DELIVERY_MESSAGE");
        const freeDeliveryFrom = await Settings.get("FREE_DELIVERY_FROM");
        if (order.basketTotal > (parseFloat(freeDeliveryFrom) ?? Infinity)) {
            return {
                cost: 0,
                item: undefined,
                message: ''
            };
        }
        else {
            return {
                cost: deliveryCost ? parseFloat(deliveryCost) : 0,
                item: deliveryItem ?? undefined,
                message: deliveryMessage ?? ''
            };
        }
    }
}
exports.DefaultDeliveryAdapter = DefaultDeliveryAdapter;
