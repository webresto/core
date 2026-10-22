"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
const promotion_code_1 = require("../lib/promotion-code");
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
        promotionCodeInit.code = (0, promotion_code_1.normalizePromotionCodeValue)(promotionCodeInit.code);
        promotionCodeInit.prefix = (0, promotion_code_1.normalizePromotionCodeValue)(promotionCodeInit.prefix);
        cb();
    },
    beforeUpdate(values, cb) {
        if (Object.prototype.hasOwnProperty.call(values, "code")) {
            values.code = (0, promotion_code_1.normalizePromotionCodeValue)(values.code);
        }
        if (Object.prototype.hasOwnProperty.call(values, "prefix")) {
            values.prefix = (0, promotion_code_1.normalizePromotionCodeValue)(values.prefix);
        }
        cb();
    },
    /**
     * The code that applies now - switched on, within its dates and its hours (`promotionCodeWorks`); null - none.
     * Asked at the apply and at every recount, so a code that ends or closes leaves the baskets that had it.
     */
    async getValidPromotionCode(promotionCodeString) {
        const normalizedCode = (0, promotion_code_1.normalizePromotionCodeValue)(promotionCodeString);
        if (!normalizedCode) {
            return null;
        }
        const promotionCode = await PromotionCode.findOne({ code: normalizedCode }).populate("promotion");
        return promotionCode && (0, promotion_code_1.promotionCodeWorks)(promotionCode) ? promotionCode : null;
    }
};
module.exports = {
    primaryKey: "id",
    attributes: attributes,
    ...Model,
};
