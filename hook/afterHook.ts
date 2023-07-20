import { RMS } from "../adapters/index";

/**
 * Initial RMS and set timezone if it given
 */
export default async function () {
  try {

    /**
     * rmsAdapter
     */
    const rmsAdapterName = await Settings.use("rmsAdapter", "restocore") as string;
    const rmsAdapterConfig = await Settings.use("rmsAdapterName", "restocore") as any;
    const imagesConfig = await Settings.use("images","restocore") as any;
    const timeSyncMenu = await Settings.use("timeSyncMenu","restocore") as number;
    const timeSyncBalance = await Settings.use("timeSyncBalance","restocore") as number;
    const timeSyncStreets = await Settings.use("timeSyncStreets","restocore") as number;
    const timeSyncPayments = await Settings.use("timeSyncPayments","restocore") as number;

    // /**
    //  * run instance RMSadapter
    //  */
    // if (rmsAdapterName) {
    //   const rmsAdapter = await RMS.getAdapter(rmsAdapterName);
    //   rmsAdapter.getInstance(rmsAdapterConfig, imagesConfig, timeSyncMenu, timeSyncBalance, timeSyncStreets);
    // }

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

  } catch (e) {
    sails.log.error("core > afterHook > error1", e);
  }
}
