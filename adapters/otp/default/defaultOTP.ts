import OneTimePasswordAdapter from "../OneTimePasswordAdapter";
import User from "../../../models/User";
import OneTimePassword from "../../../models/OneTimePassword"
export class DefaultOTP extends OneTimePasswordAdapter {
  /**
   * Send and retrun OTP code
   * Send if delivery channel to user exit, else it delivery to manager, for calling and speech
   * @param login 
   * @returns OTP
   */
  public async get(login: string): Promise<OneTimePassword> {
    let otp = await OneTimePassword.create({ login: login }).fetch();
    if (!otp.password || !login)  {
      await NotificationManager.sendMessageToDeliveryManager("error", `Failed OPT password generate for ${login}, please contact with him`);
      throw `otp generation error`
    }

    let mainLoginField = await Settings.get("LOGIN_FIELD") as string ?? 'phone';
    if (NotificationManager.isChannelExist(mainLoginField === "phone" ? "sms" : mainLoginField)){
      try {
        console.log(">>>>>>>>>>>> to user")
        await NotificationManager.sendMessageToUser("info", `Your code is ${otp.password}`,{ phone: { code: "", number:login}});
      } catch (error) {
        sails.log.error(`SEND OTP ERROR: ${error}`)
      }
    } else {
      await NotificationManager.sendMessageToDeliveryManager("info", `Please inform client ${login} OPT code ${otp.password}`);
    }
    return otp;
  }
}
