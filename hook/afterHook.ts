import { generateRandomString } from "../libs/hashCode";

/**
 * Initial RMS and set timezone if it was given
 */
export default async function () {
  try {

    const timeSyncPayments = await Settings.get("RESTOCORE_TIME_SYNC_PAYMENTS");

    /**
     * TIMEZONE
     */
    const timezone = await Settings.get("TZ");
    process.env.TZ = timezone;

    if (!await Settings.get("UUID_NAMESPACE")) {
      await Settings.set("CITY", {
        value: generateRandomString(64)
      })
    }


    await PaymentDocument.processor(timeSyncPayments);

    /**
     * Setting default
     *
     * For food delivery, the phone is primary,
     * so we set the following flags by default.
     *
     * if they need to be changed, then use the
     * config/bootstrap.js,
     * seeds/settings.json,
     * environment variables (.env)
     *  */

    /**
     * @setting CORE_LOGIN_FIELD User login field source (ex: "phone", "email" ...) [read-only by default]
     */
    await Settings.set("CORE_LOGIN_FIELD", { key: "CORE_LOGIN_FIELD", value: "phone", readOnly: true });

    /**
     * @setting CORE_LOGIN_OTP_REQUIRED check OTP on a login process
     */
    await Settings.set("CORE_LOGIN_OTP_REQUIRED", { key: "CORE_LOGIN_OTP_REQUIRED", value: true });

    /**
     * @setting CORE_SET_LAST_OTP_AS_PASSWORD setting last OTP as password
     */
    await Settings.set("CORE_SET_LAST_OTP_AS_PASSWORD", { key: "CORE_SET_LAST_OTP_AS_PASSWORD", value: true });

    /**
     * @setting CORE_PASSWORD_REQUIRED Check password (Login only by OTP if false)
     */
    await Settings.set("CORE_PASSWORD_REQUIRED", { key: "CORE_PASSWORD_REQUIRED", value: true });


    try {
      /**
       * Run instance RMS
       */
      await Adapter.getRMSAdapter();
    } catch (error) {
      sails.log.warn(" RestoCore > RMS adapter is not set ");
    }
  } catch (e) {
    sails.log.error("RestoCore > initialization error > ", e);
  }
}
