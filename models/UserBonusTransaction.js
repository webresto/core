"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
var BonusTransactionType;
(function (BonusTransactionType) {
    BonusTransactionType["CAME"] = "came";
    BonusTransactionType["GONE"] = "gone";
})(BonusTransactionType || (BonusTransactionType = {}));
let attributes = {
    /** ID */
    id: {
        type: "string",
        required: true,
    },
    /** Type of bonuses
    * came is incoming (positive transaction)
    * gone is outgoin (negative transaction)
    */
    type: {
        type: 'string',
        isIn: ['came', 'gone']
    },
    /** Custom badges */
    group: "string",
    /**
     * binary sign of transaction type
     */
    isPositive: {
        type: 'boolean',
        required: true
    },
    amount: {
        type: 'number',
    },
    balanceAfter: {
        type: 'number',
    },
    isDeleted: {
        type: 'boolean',
    },
    user: {
        model: 'user'
    },
    customData: "json",
};
let Model = {
    beforeCreate(UserBonusTransactionInit, next) {
        if (!UserBonusTransactionInit.id) {
            UserBonusTransactionInit.id = (0, uuid_1.v4)();
        }
        next();
    },
};
module.exports = {
    primaryKey: "id",
    attributes: attributes,
    ...Model,
};
