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
      const rmsAdapter = RMS.getAdapter(rmsAdapterName);
      rmsAdapter.getInstance(rmsAdapterConfig, imagesConfig, timeSyncMenu, timeSyncBalance, timeSyncStreets);
    }

    /**
     * TIMEZONE
     */
    const timezone = await Settings.use("timezone") as string;
    process.env.TZ = timezone;

    PaymentDocument.processor(timeSyncPayments);


  } catch (e) {
    sails.log.error("core > afterHook > error1", e);
  }
}
