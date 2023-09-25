"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultOTP = void 0;
const OneTimePasswordAdapter_1 = __importDefault(require("../OneTimePasswordAdapter"));
class DefaultOTP extends OneTimePasswordAdapter_1.default {
    async get(login) {
        let otp = await OneTimePassword.create({ login: login }).fetch();
        if (!otp.password || !login) {
            await NotificationManager.sendMessageToDeliveryManager("Error", `Failed OPT password generate for ${login}, please contact with him`);
            throw `otp generation error`;
        }
        // Check channel LOGIN_FIELD
        let mainLoginField = await Settings.get("LOGIN_FIELD");
        if (NotificationManager.isChannelExist(mainLoginField)) {
            let user = {};
            user[mainLoginField] = login;
            await NotificationManager.sendMessageToUser("OTP", user, `Your code is ${otp.password}`);
        }
        await NotificationManager.sendMessageToDeliveryManager("OTP", `Please inform client ${login} OPT code ${otp.password}`);
        return otp;
    }
}
exports.DefaultOTP = DefaultOTP;
