import OneTimePasswordAdapter from "../OneTimePasswordAdapter";
import { Notification } from "../../index";
let notificationAdapter = Notification.getAdapter();
export class NotificationWaterfall extends OneTimePasswordAdapter {
  public async get(login: string): Promise<void> {
    let otp = await OneTimePassword.create({ login: login }).fetch();
    if (!otp.password || !login) notificationAdapter.sendToManager("Error", `Failed OPT password generate for ${login}, please contact with him`);
    await notificationAdapter.sendToManager("OTP", `Please inform client ${login} OPT code ${otp.password}`);
  }
}
