"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const adapter_1 = require("../adapter");
const moment = require("moment-timezone");
/**
 * Initial RMS and set timezone if it given
 */
async function default_1() {
    try {
        /**
         * rmsAdapter
         */
        const rmsAdapterName = await SystemInfo.use('rmsAdapter');
        const rmsAdapterConfig = await SystemInfo.use(rmsAdapterName);
        const imagesConfig = await SystemInfo.use('images');
        const timeSyncMenu = await SystemInfo.use('timeSyncMenu');
        const timeSyncBalance = await SystemInfo.use('timeSyncBalance');
        const timeSyncStreets = await SystemInfo.use('timeSyncStreets');
        /**
         * run instance RMSadapter
         */
        if (rmsAdapterName) {
            const rmsAdapter = adapter_1.RMS.getAdapter(rmsAdapterName);
            rmsAdapter.getInstance(rmsAdapterConfig, imagesConfig, timeSyncMenu, timeSyncBalance, timeSyncStreets);
        }
        /**
         * TIMEZONE
         */
        const timezone = await SystemInfo.use('timezone');
        process.env.TZ = timezone;
        if (timezone)
            moment.tz.setDefault(timezone);
    }
    catch (e) {
        sails.log.error('core > afterHook > error1', e);
    }
}
exports.default = default_1;
;
