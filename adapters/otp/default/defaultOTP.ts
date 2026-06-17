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

    const demoOtpEnv = process.env.DEMO_OTP_LOGIN;
    if (demoOtpEnv) {
      const [demoLogin, demoPassword] = demoOtpEnv.split(':');
      if (demoLogin === login && demoPassword) {
        otp = ((await OneTimePassword.updateOne({ id: otp.id }).set({ password: demoPassword })) as unknown as OneTimePasswordRecord) ?? otp;
      }
    }

    if (!otp.password || !login)  {
      await NotificationManager.sendMessageToDeliveryManager("error", `Failed OPT password generate for ${login}, please contact with him`);
      throw `otp generation error`
    }

    // OTP delivery is handled by the notifications pipeline: OneTimePassword.afterCreate
    // emits the `user_otp_requested` event, which the enabled NotificationRules deliver
    // (template + channel waterfall). The legacy in-adapter send below is kept only as an
    // opt-in fallback for installs not yet migrated to a notification rule. It is OFF by
    // default so the two paths don't double-send; enable with OTP_LEGACY_DELIVERY=true.
    if (isLegacyOtpDeliveryEnabled()) {
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
    }
    return otp;
  }
}

/**
 * Legacy OTP delivery toggle.
 *
 * The canonical delivery path is the notifications pipeline (`user_otp_requested`
 * event -> NotificationRules). The legacy in-adapter send is disabled by default so the
 * two paths don't double-send. Set OTP_LEGACY_DELIVERY to a truthy value (true/1/yes/on)
 * to re-enable it for installs that have not migrated to a notification rule yet.
 */
function isLegacyOtpDeliveryEnabled(): boolean {
  return /^(true|1|yes|on)$/i.test(String(process.env.OTP_LEGACY_DELIVERY ?? "").trim());
}
