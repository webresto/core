"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultDeliveryAdapter = void 0;
const DeliveryAdapter_1 = require("../DeliveryAdapter");
class DefaultDeliveryAdapter extends DeliveryAdapter_1.default {
    async calculate(order) {
        console.log(" DefaultDeliveryAdapter calculate cost");
        const deliveryCost = await Settings.get("DELIVERY_COST");
        const deliveryItem = await Settings.get("DELIVERY_ITEM");
        const deliveryMessage = await Settings.get("DELIVERY_MESSAGE");
        const freeDeliveryFrom = await Settings.get("FREE_DELIVERY_FROM");
        if (order.basketTotal > (parseFloat(freeDeliveryFrom) ?? Infinity)) {
            return {
                cost: null,
                item: undefined,
                message: ''
            };
        }
        else {
            return {
                cost: parseFloat(deliveryCost) ?? null,
                item: deliveryItem ?? undefined,
                message: deliveryMessage ?? ''
            };
        }
    }
    async reset(order) {
        console.log(" DefaultDeliveryAdapter Order reset ");
        return;
    }
}
exports.DefaultDeliveryAdapter = DefaultDeliveryAdapter;
