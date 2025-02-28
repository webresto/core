"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultDeliveryAdapter = void 0;
const DeliveryAdapter_1 = __importDefault(require("../DeliveryAdapter"));
class DefaultDeliveryAdapter extends DeliveryAdapter_1.default {
    async checkAbility(address) {
        const minDeliveryTimeInMinutes = await Settings.get("MIN_DELIVERY_TIME_IN_MINUTES");
        const deliveryCost = await Settings.get("DELIVERY_COST");
        const freeDeliveryFrom = await Settings.get("FREE_DELIVERY_FROM");
        const minDeliveryAmount = await Settings.get("MIN_DELIVERY_AMOUNT");
        const currencyISO = await Settings.get("DEFAULT_CURRENCY_ISO");
        const messageTemplate = await Settings.get("CHECK_DELIVERY_MESSAGE_TEMPLATE");
        let currency = sails.dictionaries.currencies[currencyISO].currencySymbol;
        const messageData = {
            minDeliveryTime: minDeliveryTimeInMinutes,
            deliveryCost: deliveryCost,
            freeDeliveryFrom: freeDeliveryFrom,
            minDeliveryAmount: minDeliveryAmount,
            currency: currency
        };
        let message = messageTemplate;
        for (const [key, value] of Object.entries(messageData)) {
            if (value !== undefined && value !== null) {
                message = message.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
            }
        }
        return {
            deliveryTimeMinutes: minDeliveryTimeInMinutes,
            allowed: true,
            cost: deliveryCost,
            item: null,
            message: message
        };
    }
    async calculate(order) {
        const deliveryCost = await Settings.get("DELIVERY_COST");
        const deliveryItem = await Settings.get("DELIVERY_ITEM");
        const deliveryMessage = await Settings.get("DELIVERY_MESSAGE");
        const freeDeliveryFrom = await Settings.get("FREE_DELIVERY_FROM");
        const minDeliveryAmount = await Settings.get("MIN_DELIVERY_AMOUNT");
        const minDeliveryTimeInMinutes = await Settings.get("MIN_DELIVERY_TIME_IN_MINUTES");
        if (order.basketTotal < minDeliveryAmount ?? 0) {
            return {
                allowed: false,
                deliveryTimeMinutes: minDeliveryTimeInMinutes ?? 60,
                cost: 0,
                item: undefined,
                message: `Minimum amount not allowed`
            };
        }
        if (order.basketTotal > (freeDeliveryFrom ?? Infinity)) {
            return {
                allowed: true,
                deliveryTimeMinutes: minDeliveryTimeInMinutes ?? 60,
                cost: 0,
                item: undefined,
                message: ''
            };
        }
        else {
            return {
                allowed: true,
                deliveryTimeMinutes: minDeliveryTimeInMinutes ?? 60,
                cost: deliveryCost ? deliveryCost : 0,
                item: deliveryItem ?? undefined,
                message: deliveryMessage ?? ''
            };
        }
    }
}
exports.DefaultDeliveryAdapter = DefaultDeliveryAdapter;
