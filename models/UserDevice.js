"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
let attributes = {
    /** ID */
    id: {
        type: "string",
        //required: true,
    },
    name: 'string',
    userAgent: 'string',
    isActive: "boolean",
    user: {
        model: 'user',
        via: 'devices'
    },
    lastIP: "string",
    lastLogin: "number",
    customData: "json",
};
let Model = {
    beforeCreate(UserLocationInit, next) {
        if (!UserLocationInit.id) {
            UserLocationInit.id = (0, uuid_1.v4)();
        }
        next();
    },
};
module.exports = {
    primaryKey: "id",
    attributes: attributes,
    ...Model,
};
