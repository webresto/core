"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
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
        serial - maybe pregenrated, need store
        external - connect to external system (bad way becose need make request)
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
        cb();
    },
    /**
     * Check promocode is work now
     */
    async getValidPromotionCode(promotionCodeString) {
        return await PromotionCode.findOne({ code: promotionCodeString }).populate("promotion");
        //return null
    }
};
module.exports = {
    primaryKey: "id",
    attributes: attributes,
    ...Model,
};
