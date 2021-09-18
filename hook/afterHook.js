"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const adapters_1 = require("../adapters");
/**
 * Initial RMS and set timezone if it given
 */
async function default_1() {
    try {
        /**
         * rmsAdapter
         */
        const rmsAdapterName = await Settings.use("rmsAdapter");
        const rmsAdapterConfig = await Settings.use(rmsAdapterName);
        const imagesConfig = await Settings.use("images");
        const timeSyncMenu = await Settings.use("timeSyncMenu");
        const timeSyncBalance = await Settings.use("timeSyncBalance");
        const timeSyncStreets = await Settings.use("timeSyncStreets");
        const timeSyncPayments = await Settings.use("timeSyncPayments");
        /**
         * run instance RMSadapter
         */
        if (rmsAdapterName) {
            const rmsAdapter = adapters_1.RMS.getAdapter(rmsAdapterName);
            rmsAdapter.getInstance(rmsAdapterConfig, imagesConfig, timeSyncMenu, timeSyncBalance, timeSyncStreets);
        }
        /**
         * TIMEZONE
         */
        const timezone = await Settings.use("timezone");
        process.env.TZ = timezone;
        PaymentDocument.processor(timeSyncPayments);
    }
    catch (e) {
        sails.log.error("core > afterHook > error1", e);
    }
}
exports.default = default_1;
