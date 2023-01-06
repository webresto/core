"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultOTP = void 0;
const OneTimePasswordAdapter_1 = require("../OneTimePasswordAdapter");
class DefaultOTP extends OneTimePasswordAdapter_1.default {
    async get(login) {
        let otp = await OneTimePassword.create({ login: login }).fetch();
        if (!otp.password || !login)
            await NotificationManager.sendMessageToDeliveryManager("Error", `Failed OPT password generate for ${login}, please contact with him`);
        await NotificationManager.sendMessageToDeliveryManager("OTP", `Please inform client ${login} OPT code ${otp.password}`);
    }
}
exports.DefaultOTP = DefaultOTP;
