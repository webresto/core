import { RMS } from "../adapters";

/**
 * Initial RMS and set timezone if it given
 */
export default async function () {
  try {

    /**
     * rmsAdapter
     */
    const rmsAdapterName = await Settings.use("rmsAdapter", "restocore") as string;
    const rmsAdapterConfig = await Settings.use(rmsAdapterName, "restocore");
    const imagesConfig = await Settings.use("images","restocore");
    const timeSyncMenu = await Settings.use("timeSyncMenu","restocore");
    const timeSyncBalance = await Settings.use("timeSyncBalance","restocore");
    const timeSyncStreets = await Settings.use("timeSyncStreets","restocore");
    const timeSyncPayments = await Settings.use("timeSyncPayments","restocore") as number;

    /**
     * run instance RMSadapter
     */
    if (rmsAdapterName) {
      const rmsAdapter = await RMS.getAdapter(rmsAdapterName);
      rmsAdapter.getInstance(rmsAdapterConfig, imagesConfig, timeSyncMenu, timeSyncBalance, timeSyncStreets);
    }

    /**
     * TIMEZONE
     */
    const timezone = await Settings.use("timezone") as string;
    process.env.TZ = timezone;

    PaymentDocument.processor(timeSyncPayments);

    //Set default
    await Settings.setDefault("LOGIN_FIELD", "phone");    
    await Settings.setDefault("REGISTRATION_OTP_REQUIRED", true);
    await Settings.setDefault("LOGIN_OTP_REQUIRED", true);
    await Settings.setDefault("SET_LAST_OTP_AS_PASSWORD", true);
    await Settings.setDefault("PASSWORD_REQUIRED", false);
    
    if (!await Settings.get("PASSWORD_REQUIRED") && !await Settings.get("REGISTRATION_OTP_REQUIRED")){
      sails.log.info(`Use default registartion strategy [OTP]`)
      await Settings.set("LOGIN_OTP_REQUIRED", true);
      await Settings.set("REGISTRATION_OTP_REQUIRED", true);
    }
    
  } catch (e) {
    sails.log.error("core > afterHook > error1", e);
  }
}
