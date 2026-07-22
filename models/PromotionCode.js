"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
function normalizePromotionCodeValue(value) {
    if (value === null || value === undefined) {
        return null;
    }
    const normalized = String(value).trim().toUpperCase();
    return normalized || null;
}
let attributes = {
    /** ID */
    id: {
        type: "string",
        //required: true,
    },
    /** Id in external system */
    externalId: {
        type: "string",
        allowNull: true
    },
    /** Not Generated */
    type: {
        type: 'string',
        /**
        static - just one promocode
        generated - uses promocodeGeneratorAdapter TODO: see test/experiments dir
        serial - maybe pre-generated, need store
        external - connect to external system (bad way because need make request)
         * */
        isIn: ['static',
            // 'generated', 'serial', 'external'
        ]
    },
    /** base for PromotionCode */
    prefix: {
        type: "string",
        allowNull: true
    },
    /** Whether customers can apply this promo code. */
    enable: {
        type: "boolean",
        defaultsTo: true,
    },
    startDate: "string",
    stopDate: "string",
    workTime: "json",
    description: {
        type: "string",
        required: true,
    },
    code: {
        type: "string",
        allowNull: true
    },
    // TODO: Add interval to allow for use again
    promotion: {
        collection: "promotion",
        via: "promotionCode"
    },
    generateConfig: {
        type: "json",
    },
    customData: "json",
};
let Model = {
    beforeCreate(promotionCodeInit, cb) {
        if (!promotionCodeInit.id) {
            promotionCodeInit.id = (0, uuid_1.v4)();
        }
        promotionCodeInit.code = normalizePromotionCodeValue(promotionCodeInit.code);
        promotionCodeInit.prefix = normalizePromotionCodeValue(promotionCodeInit.prefix);
        cb();
    },
    beforeUpdate(values, cb) {
        if (Object.prototype.hasOwnProperty.call(values, "code")) {
            values.code = normalizePromotionCodeValue(values.code);
        }
        if (Object.prototype.hasOwnProperty.call(values, "prefix")) {
            values.prefix = normalizePromotionCodeValue(values.prefix);
        }
        cb();
    },
    /**
     * Check promocode is work now
     */
    async getValidPromotionCode(promotionCodeString) {
        const normalizedCode = normalizePromotionCodeValue(promotionCodeString);
        if (!normalizedCode) {
            return null;
        }
        // `enable` was added after promo codes already existed. Treat records without
        // the flag as enabled so a deploy does not silently disable existing codes.
        const promotionCode = await PromotionCode.findOne({ code: normalizedCode }).populate("promotion");
        return promotionCode?.enable === false ? null : promotionCode;
    }
};
module.exports = {
    primaryKey: "id",
    attributes: attributes,
    ...Model,
};
