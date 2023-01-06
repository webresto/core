import OneTimePasswordAdapter from "../OneTimePasswordAdapter";
export class DefaultOTP extends OneTimePasswordAdapter {
  public async get(login: string): Promise<void> {
    let otp = await OneTimePassword.create({ login: login }).fetch();
    if (!otp.password || !login)  await NotificationManager.sendMessageToDeliveryManager("Error", `Failed OPT password generate for ${login}, please contact with him`);
    await NotificationManager.sendMessageToDeliveryManager("OTP", `Please inform client ${login} OPT code ${otp.password}`);
  }
}
