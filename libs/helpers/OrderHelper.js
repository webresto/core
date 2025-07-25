"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderHelper = void 0;
const hashCode_1 = __importDefault(require("../hashCode"));
const stringsInArray_1 = require("../stringsInArray");
class OrderHelper {
    constructor(orderId) {
    }
    static async initCheckout(populatedOrder) {
        let initCheckout = {
            worktimeIntervals: [],
            allowSoonAsPossible: true,
            allowOrderToTime: true,
            nonce: 0,
            bonusBannerHTMLChunk: null
        };
        await emitter.emit('core:order-init-checkout', populatedOrder, initCheckout);
        initCheckout.nonce = populatedOrder.nonce;
        initCheckout.bonusBannerHTMLChunk = await Settings.get("BONUS_BANNER_HTML_CHUNK");
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
