"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderHelper = void 0;
const hashCode_1 = require("../hashCode");
const stringsInArray_1 = require("../stringsInArray");
class OrderHelper {
    constructor(orderId) {
    }
    static async initCheckout(populatedOrder) {
        let initCheckout = {
            worktimeIntervals: [],
            allowSoonAsPossible: true,
            allowOrderToTime: true,
            nonce: 0
        };
        await emitter.emit('core:order-init-checkout', populatedOrder, initCheckout);
        initCheckout.nonce = populatedOrder.nonce;
        return initCheckout;
    }
    static orderHash(populatedOrder) {
        const fieldsToExclude = [
            'createdAt',
            'updatedAt',
            'shortId',
            'isPromoting',
            'nonce',
            'hash'
        ];
        let summarizeOrder = (0, stringsInArray_1.extractFieldValues)(populatedOrder, fieldsToExclude).join("");
        let hash = (0, hashCode_1.default)(summarizeOrder);
        return hash;
    }
}
exports.OrderHelper = OrderHelper;
