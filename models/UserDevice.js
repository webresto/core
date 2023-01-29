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
    },
    lastIP: "string",
    loginTime: { type: "number" },
    lastActivity: { type: "number" },
    /**  (not jwt-token)  */
    sessionId: {
        type: "string",
        allowNull: true
    },
    customData: "json",
};
let Model = {
    beforeUpdate(record, next) {
        record.lastActivity = Date.now();
        if (record.user)
            delete record.user;
        if (record.isLogined === false) {
            record.sessionId = null;
        }
        if (record.isLogined === true) {
            record.sessionId = (0, uuid_1.v4)();
        }
        next();
    },
    beforeCreate(record, next) {
        record.lastActivity = Date.now();
        if (!record.id) {
            record.id = (0, uuid_1.v4)();
        }
        if (record.isLogined === true) {
            record.sessionId = (0, uuid_1.v4)();
        }
        next();
    },
    /** Method set lastActiity  for device */
    async setActivity(criteria, client = {}) {
        await UserDevice.update(criteria, client);
    },
    async checkSession(sessionId, userId, client = {}) {
        let ud = await UserDevice.findOne({ sessionId: sessionId });
        if (!ud) {
            return false;
        }
        if (ud.user === userId && ud.isLogined) {
            await UserDevice.setActivity({ id: ud.id }, client);
            return true;
        }
        return false;
    }
};
module.exports = {
    primaryKey: "id",
    attributes: attributes,
    ...Model,
};
