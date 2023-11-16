"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultOTP = void 0;
const OneTimePasswordAdapter_1 = __importDefault(require("../OneTimePasswordAdapter"));
class DefaultOTP extends OneTimePasswordAdapter_1.default {
    /**
     * Send and retrun OTP code
     * Send if delivery channel to user exit, else it delivery to manager, for calling and speech
     * @param login
     * @returns OTP
     */
    async get(login) {
        let otp = await OneTimePassword.create({ login: login }).fetch();
        if (!otp.password || !login) {
            await NotificationManager.sendMessageToDeliveryManager("error", `Failed OPT password generate for ${login}, please contact with him`);
            throw `otp generation error`;
        }
        let mainLoginField = await Settings.get("LOGIN_FIELD") ?? 'phone';
        if (NotificationManager.isChannelExist(mainLoginField === "phone" ? "sms" : mainLoginField)) {
            try {
                console.log(">>>>>>>>>>>> to user");
                await NotificationManager.sendMessageToUser("info", `Your code is ${otp.password}`, { phone: { code: "", number: login } });
            }
            catch (error) {
                sails.log.error(`SEND OTP ERROR: ${error}`);
            }
        }
        else {
            await NotificationManager.sendMessageToDeliveryManager("info", `Please inform client ${login} OPT code ${otp.password}`);
        }
        return otp;
    }
}
exports.DefaultOTP = DefaultOTP;
