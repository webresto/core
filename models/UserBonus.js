"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
let attributes = {
    /** ID */
    id: {
        type: "string",
        //required: true,
    },
    /** Type of bonuses */
    type: 'string',
    active: {
        type: 'boolean',
        defaultsTo: true
    },
    balance: {
        type: 'boolean',
        defaultsTo: true
    },
    isDeleted: {
        type: 'boolean',
    },
    user: {
        collection: 'user',
        via: "bonuses"
    },
    customData: "json",
};
let Model = {
    beforeCreate(UserBonusInit, next) {
        if (!UserBonusInit.id) {
            UserBonusInit.id = (0, uuid_1.v4)();
        }
        next();
    },
};
module.exports = {
    primaryKey: "id",
    attributes: attributes,
    ...Model,
};
