"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Initial RMS and set timezone if it given
 */
async function default_1() {
    try {
        /**
         * rmsAdapter
         */
        const rmsAdapterName = await Settings.use("rmsAdapter", "restocore");
        const rmsAdapterConfig = await Settings.use("rmsAdapterName", "restocore");
        const imagesConfig = await Settings.use("images", "restocore");
        const timeSyncMenu = await Settings.use("timeSyncMenu", "restocore");
        const timeSyncBalance = await Settings.use("timeSyncBalance", "restocore");
        const timeSyncStreets = await Settings.use("timeSyncStreets", "restocore");
        const timeSyncPayments = await Settings.use("timeSyncPayments", "restocore");
        /**
         * TIMEZONE
         */
        const timezone = await Settings.use("timezone");
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
        /**
         * Run instance RMS
         */
        Adapter.getRMSAdapter();
    }
    catch (e) {
        sails.log.error("core > afterHook > error1", e);
    }
}
exports.default = default_1;
