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
        const rmsAdapterName = await Settings.use("rmsAdapter", "restocore");
        const rmsAdapterConfig = await Settings.use(rmsAdapterName, "restocore");
        const imagesConfig = await Settings.use("images", "restocore");
        const timeSyncMenu = await Settings.use("timeSyncMenu", "restocore");
        const timeSyncBalance = await Settings.use("timeSyncBalance", "restocore");
        const timeSyncStreets = await Settings.use("timeSyncStreets", "restocore");
        const timeSyncPayments = await Settings.use("timeSyncPayments", "restocore");
        /**
         * run instance RMSadapter
         */
        if (rmsAdapterName) {
            const rmsAdapter = await adapters_1.RMS.getAdapter(rmsAdapterName);
            rmsAdapter.getInstance(rmsAdapterConfig, imagesConfig, timeSyncMenu, timeSyncBalance, timeSyncStreets);
        }
        /**
         * TIMEZONE
         */
        const timezone = await Settings.use("timezone");
        process.env.TZ = timezone;
        PaymentDocument.processor(timeSyncPayments);
        //Set default
        await Settings.setDefault("LOGIN_FIELD", "phone");
        await Settings.setDefault("REGISTRATION_OTP_REQUIRED", true);
        await Settings.setDefault("LOGIN_OTP_REQUIRED", true);
        await Settings.setDefault("SET_LAST_OTP_AS_PASSWORD", true);
        await Settings.setDefault("PASSWORD_REQUIRED", false);
        if (!await Settings.get("PASSWORD_REQUIRED") && !await Settings.get("REGISTRATION_OTP_REQUIRED")) {
            sails.log.info(`Use default registartion strategy [OTP]`);
            await Settings.set("LOGIN_OTP_REQUIRED", true);
            await Settings.set("REGISTRATION_OTP_REQUIRED", true);
        }
    }
    catch (e) {
        sails.log.error("core > afterHook > error1", e);
    }
}
exports.default = default_1;
