import OneTimePasswordAdapter from "../OneTimePasswordAdapter";
import User from "../../../models/User";
import OneTimePassword from "../../../models/OneTimePassword"
export class DefaultOTP extends OneTimePasswordAdapter {
  public async get(login: string): Promise<OneTimePassword> {
    let otp = await OneTimePassword.create({ login: login }).fetch();
    if (!otp.password || !login)  {
      await NotificationManager.sendMessageToDeliveryManager("Error", `Failed OPT password generate for ${login}, please contact with him`);
      throw `otp generation error`
    }

    // Check channel LOGIN_FIELD
    let mainLoginField = await Settings.get("LOGIN_FIELD") as string;
    if (NotificationManager.isChannelExist(mainLoginField)){
      let user: User = { }
      user[mainLoginField] = login 
      await NotificationManager.sendMessageToUser("OTP", user, `Your code is ${otp.password}`);
    }

    await NotificationManager.sendMessageToDeliveryManager("OTP", `Please inform client ${login} OPT code ${otp.password}`);
    return otp;
  }
}
