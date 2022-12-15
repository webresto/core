"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const adapters_1 = require("../adapters");
const getEmitter_1 = require("../libs/getEmitter");
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
            const rmsAdapter = adapters_1.RMS.getAdapter(rmsAdapterName);
            rmsAdapter.getInstance(rmsAdapterConfig, imagesConfig, timeSyncMenu, timeSyncBalance, timeSyncStreets);
        }
        /**
         * TIMEZONE
         */
        const timezone = await Settings.use("timezone");
        process.env.TZ = timezone;
        PaymentDocument.processor(timeSyncPayments);
        // @ts-ignore
        global.emitter = (0, getEmitter_1.default)();
    }
    catch (e) {
        sails.log.error("core > afterHook > error1", e);
    }
}
exports.default = default_1;
