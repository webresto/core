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
    loginTime: "number",
    lastActivity: "number",
    customData: "json",
};
let Model = {
    beforeUpdate(record, next) {
        record.lastActivity = new Date().toISOString();
    },
    beforeCreate(record, next) {
        record.lastActivity = new Date().toISOString();
        if (!record.id) {
            record.id = (0, uuid_1.v4)();
        }
        next();
    },
};
module.exports = {
    primaryKey: "id",
    attributes: attributes,
    ...Model,
};
