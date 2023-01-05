"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationWaterfall = void 0;
const OneTimePasswordAdapter_1 = require("../OneTimePasswordAdapter");
const index_1 = require("../../index");
let notificationAdapter = index_1.Notification.getAdapter();
class NotificationWaterfall extends OneTimePasswordAdapter_1.default {
    async get(login) {
        let otp = await OneTimePassword.create({ login: login }).fetch();
        if (!otp.password || !login)
            notificationAdapter.sendToManager("Error", `Failed OPT password generate for ${login}, please contact with him`);
        await notificationAdapter.sendToManager("OTP", `Please inform client ${login} OPT code ${otp.password}`);
    }
}
exports.NotificationWaterfall = NotificationWaterfall;
