import { coreI18n } from "../../../hook/bindLocales";
import { OneTimePasswordRecord } from "../../../models/OneTimePassword";
import OneTimePasswordAdapter from "../OneTimePasswordAdapter";
// todo: fix types model instance to {%ModelName%}Record for OneTimePassword"
export class DefaultOTP extends OneTimePasswordAdapter {
  /**
   * Send and return OTP code
   * Send if delivery channel to user exit, else it delivers to manager, for calling and speech
   * @param login
   * @returns OTP
   */
  public async get(login: string): Promise<OneTimePasswordRecord> {
    let otp = await OneTimePassword.create({ login: login }).fetch();
    if (!otp.password || !login)  {
      await NotificationManager.sendMessageToDeliveryManager("error", `Failed OPT password generate for ${login}, please contact with him`);
      throw `otp generation error`
    }

    let mainLoginField = await Settings.get("CORE_LOGIN_FIELD") ?? 'phone';
    if (NotificationManager.isChannelExist(mainLoginField === "phone" ? "sms" : mainLoginField)){
      try {
        let from = await Settings.get("PROJECT_NAME")
        from = from ? from + ": " : ""
        const message =  from + (await coreI18n(`Your secret login code:`)) + " " + otp.password
        await NotificationManager.sendMessageToUser("info", message, { phone: { code: "", number:login}});
      } catch (error) {
        sails.log.error(`SEND OTP ERROR: ${error}`)
      }
    } else {
      await NotificationManager.sendMessageToDeliveryManager("info", `Please inform client ${login} OPT code ${otp.password}`);
    }
    return otp;
  }
}
