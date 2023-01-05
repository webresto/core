"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Waterfall = void 0;
const OneTimePasswordAdapter_1 = require("../OneTimePasswordAdapter");
const index_1 = require("../../index");
class Waterfall extends OneTimePasswordAdapter_1.default {
    async get(login) {
        let notificationAdapter = index_1.Notification.getAdapter();
        let otp = await OneTimePassword.create({ login: login }).fetch();
        if (!otp.password || !login)
            notificationAdapter.sendToManager("Error", `Failed OPT password generate for ${login}, please contact with him`);
        await notificationAdapter.sendToManager("OTP", `Please inform client ${login} OPT code ${otp.password}`);
    }
}
exports.Waterfall = Waterfall;
