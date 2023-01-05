import OneTimePasswordAdapter from "../OneTimePasswordAdapter";
import { Notification } from "../../index";
export class Waterfall extends OneTimePasswordAdapter {
  public async get(login: string): Promise<void> {
    let notificationAdapter = Notification.getAdapter();
    let otp = await OneTimePassword.create({ login: login }).fetch();
    if (!otp.password || !login) notificationAdapter.sendToManager("Error", `Failed OPT password generate for ${login}, please contact with him`);
    await notificationAdapter.sendToManager("OTP", `Please inform client ${login} OPT code ${otp.password}`);
  }
}
