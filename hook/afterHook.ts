
/**
 * Initial RMS and set timezone if it given
 */
export default async function () {
  try {

    const timeSyncPayments = await Settings.use("timeSyncPayments","restocore") as number;


    /**
     * TIMEZONE
     */
    const timezone = await Settings.use("timezone") as string;
    process.env.TZ = timezone;

    PaymentDocument.processor(timeSyncPayments);

    /**  
     * Setting default
     * 
     * For food delivery, the phone is primary, 
     * so we set the following flags by default, 
     * 
     * if they need to be changed, then use the 
     * config/bootstrap.js, 
     * seeds/settings.json, 
     * environment variables (.env)
     *  */ 

    /**
     * @setting LOGIN_FIELD User login field source (ex: "phone", "email" ...) [read only by default]
     */
    await Settings.setDefault("LOGIN_FIELD", "phone", "core", true);    
 

    /**
     * @setting LOGIN_OTP_REQUIRED check OTP on login process 
     */
    await Settings.setDefault("LOGIN_OTP_REQUIRED", true, "core");

    /**
     * @setting SET_LAST_OTP_AS_PASSWORD setting last OTP as password 
     */
    await Settings.setDefault("SET_LAST_OTP_AS_PASSWORD", true, "core");
    
    /**
     * @setting PASSWORD_REQUIRED Check password (Login only by OTP if false) 
     */
    await Settings.setDefault("PASSWORD_REQUIRED", true, "core");

  
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
