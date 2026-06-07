"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
let attributes = {
    /** ID */
    id: {
        type: "string",
        //required: true,
    },
    /** Generated name from an OS type, and location */
    name: 'string',
    userAgent: 'string',
    isLoggedIn: "boolean",
    /** Owner of the device. May be empty (null) — a device always exists, but it gets bound to a user only after login */
    user: {
        model: 'user'
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
    /** Provider-independent notification token (FCM, APNs, WebPush, etc.). */
    notificationToken: {
        type: "json",
    },
};
let Model = {
    beforeUpdate(record, cb) {
        record.lastActivity = Date.now();
        // NOTE: `user` is intentionally NOT stripped here anymore. Binding an empty
        // device to a user (and the "rebind forbidden" rule) is handled centrally in
        // `User.authDevice`. Stripping it here made it impossible to ever bind a device.
        if (record.isLoggedIn === false) {
            record.sessionId = null;
        }
        cb();
    },
    /**
     * For each request from user device to core
     */
    afterUpdate(record, cb) {
        UserBonusProgram.syncAll(record.user);
        return cb();
    },
    beforeCreate(record, cb) {
        record.lastActivity = Date.now();
        if (!record.id) {
            record.id = (0, uuid_1.v4)();
        }
        cb();
    },
    /** Method set lastActivity for a device */
    async setActivity(criteria, client = {}) {
        await UserDevice.update(criteria, client).fetch();
    },
    async setNotificationToken(deviceId, token) {
        await UserDevice.updateOne({ id: deviceId }).set({ notificationToken: token });
    },
    async checkSession(sessionId, userId, client = {}) {
        let ud = await UserDevice.findOne({ sessionId: sessionId });
        if (!ud) {
            return false;
        }
        if (ud.user === userId && ud.isLoggedIn) {
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
