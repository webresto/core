"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OTP = exports.Captcha = exports.Payment = exports.Media = exports.Map = exports.RMS = void 0;
const pow_1 = require("./captcha/default/pow");
const defaultOTP_1 = require("./otp/default/defaultOTP");
const fs = require("fs");
const WEBRESTO_MODULES_PATH = process.env.WEBRESTO_MODULES_PATH === undefined ? "@webresto" : process.env.WEBRESTO_MODULES_PATH;
/**
 * retruns RMS-adapter
 */
class RMS {
    static async getAdapter(adapterName) {
        // if(!Boolean(adapterName)) {
        //   sails.log.warn(`RMS adapter not defined: ${adapterName}`);
        //   return 
        // }
        // For factory we use different dirrectory for modules
        if (!adapterName) {
            adapterName = await Settings.get("DEFAULT_RMS_ADAPTER");
        }
        // if(!adapterName) {
        //   // RUN DUMMY ADAPTER
        // }
        let adapterLocation = WEBRESTO_MODULES_PATH + "/" + adapterName.toLowerCase() + "-rms-adapter";
        adapterLocation = fs.existsSync(adapterLocation) ? adapterLocation : "@webresto/" + adapterName.toLowerCase() + "-rms-adapter";
        try {
            const adapter = require(adapterLocation);
            return adapter.RMS.default;
        }
        catch (e) {
            sails.log.error("CORE > getAdapter RMS > error; ", e);
            throw new Error("Module " + adapterLocation + " not found");
        }
    }
}
exports.RMS = RMS;
/**
 * retruns Map-adapter
 */
class Map {
    static async getAdapter(adapterName) {
        if (!adapterName) {
            adapterName = await Settings.get("DEFAULT_MAP_ADAPTER");
        }
        let adapterLocation = WEBRESTO_MODULES_PATH + "/" + adapterName.toLowerCase() + "-map-adapter";
        adapterLocation = fs.existsSync(adapterLocation) ? adapterLocation : "@webresto/" + adapterName.toLowerCase() + "-map-adapter";
        try {
            const adapter = require(adapterLocation);
            return adapter.MapAdapter.default;
        }
        catch (e) {
            sails.log.error("CORE > getAdapter Map > error; ", e);
            throw new Error("Module " + adapterLocation + " not found");
        }
    }
}
exports.Map = Map;
/**
 * retruns MediaFile-adapter
 */
class Media {
    static async getAdapter(adapterName) {
        // if(!Boolean(adapterName)) {
        //   sails.log.warn(`MediaFile adapter not defined: ${adapterName}`);
        //   return 
        // }
        if (!adapterName) {
            adapterName = await Settings.get("MEDIAFILE_ADAPTER");
        }
        let adapter;
        // Use default adapter local Imagemagick
        if (!adapterName || "imagemagick-local") {
            adapter = require("./mediafile/default/im-local");
        }
        else {
            let adapterLocation = WEBRESTO_MODULES_PATH + "/" + adapterName.toLowerCase() + "-image-adapter";
            adapterLocation = fs.existsSync(adapterLocation) ? adapterLocation : "@webresto/" + adapterName.toLowerCase() + "-image-adapter";
            try {
                adapter = require(adapterLocation);
            }
            catch (e) {
                sails.log.error("CORE > getAdapter MediaFileA > error; ", e);
                throw new Error("Module " + adapterLocation + " not found");
            }
        }
        return adapter.default;
    }
}
exports.Media = Media;
/**
 * retruns Payment-adapter
 */
class Payment {
    static async getAdapter(adapterName) {
        // if(!Boolean(adapterName)) {
        //   sails.log.warn(`Payment adapter not defined: ${adapterName}`);
        //   return 
        // }
        if (!adapterName) {
            adapterName = await Settings.get("DEFAULT_PAYMENT_ADAPTER");
        }
        let adapterLocation = WEBRESTO_MODULES_PATH + "/" + adapterName.toLowerCase() + "-payment-adapter";
        adapterLocation = fs.existsSync(adapterLocation) ? adapterLocation : "@webresto/" + adapterName.toLowerCase() + "-payment-adapter";
        try {
            const adapter = require(adapterLocation);
            return adapter.PaymentAdapter[adapterName.toUpperCase()];
        }
        catch (e) {
            sails.log.error("CORE > getAdapter Payment > error; ", e);
            throw new Error("Module " + adapterLocation + " not found");
        }
    }
}
exports.Payment = Payment;
/**
 * retruns Captcha-adapter
 */
class Captcha {
    static async getAdapter(adapterName) {
        if (!adapterName) {
            adapterName = await Settings.get("DEFAULT_CAPTCHA_ADAPTER");
        }
        // Use default adapter POW (crypto-puzzle)
        if (!adapterName) {
            return new pow_1.POW;
        }
        let adapterLocation = WEBRESTO_MODULES_PATH + "/" + adapterName.toLowerCase() + "-captcha-adapter";
        adapterLocation = fs.existsSync(adapterLocation) ? adapterLocation : "@webresto/" + adapterName.toLowerCase() + "-captcha-adapter";
        try {
            const adapter = require(adapterLocation);
            return new adapter.CaptchaAdapter[adapterName];
        }
        catch (e) {
            sails.log.error("CORE > getAdapter Captcha > error; ", e);
            throw new Error("Module " + adapterLocation + " not found");
        }
    }
}
exports.Captcha = Captcha;
/**
 * retruns OTP-adapter
 */
class OTP {
    static async getAdapter(adapterName) {
        if (!adapterName) {
            adapterName = await Settings.get("DEFAULT_OTP_ADAPTER");
        }
        // Use default adapter POW (crypto-puzzle)
        if (!adapterName) {
            return new defaultOTP_1.DefaultOTP;
        }
        let adapterLocation = WEBRESTO_MODULES_PATH + "/" + adapterName.toLowerCase() + "-otp-adapter";
        adapterLocation = fs.existsSync(adapterLocation) ? adapterLocation : "@webresto/" + adapterName.toLowerCase() + "-otp-adapter";
        try {
            const adapter = require(adapterLocation);
            return new adapter.OTPAdapter[adapterName];
        }
        catch (e) {
            sails.log.error("CORE > getAdapter OTP > error; ", e);
            throw new Error("Module " + adapterLocation + " not found");
        }
    }
}
exports.OTP = OTP;
