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
    isLogined: "boolean",
    user: {
        model: 'user',
        via: 'devices'
    },
    lastIP: "string",
    loginTime: "number",
    lastActivity: "number",
    authToken: {
        type: "string",
        allowNull: true
    },
    customData: "json",
};
let Model = {
    beforeUpdate(record, next) {
        record.lastActivity = new Date().toISOString();
        if (record.user)
            delete record.user;
        if (record.isLogined === false) {
            record.authToken = null;
        }
        if (record.isLogined === true) {
            record.authToken = (0, uuid_1.v4)();
        }
    },
    beforeCreate(record, next) {
        record.lastActivity = new Date().toISOString();
        if (!record.id) {
            record.id = (0, uuid_1.v4)();
        }
        if (record.isLogined === true) {
            record.authToken = (0, uuid_1.v4)();
        }
        next();
    },
};
module.exports = {
    primaryKey: "id",
    attributes: attributes,
    ...Model,
};
