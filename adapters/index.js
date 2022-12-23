"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Captcha = exports.Payment = exports.MediaFileA = exports.Map = exports.RMS = void 0;
const pow_1 = require("./captcha/default/pow");
const fs = require("fs");
const WEBRESTO_MODULES_PATH = process.env.WEBRESTO_MODULES_PATH === undefined ? "@webresto" : process.env.WEBRESTO_MODULES_PATH;
/**
 * retruns RMS-adapter
 */
class RMS {
    static getAdapter(adapterName) {
        // if(!Boolean(adapterName)) {
        //   sails.log.warn(`RMS adapter not defined: ${adapterName}`);
        //   return 
        // }
        // For factory we use different dirrectory for modules
        let adapterLocation = WEBRESTO_MODULES_PATH + "/" + adapterName.toLowerCase() + "-rms-adapter";
        adapterLocation = fs.existsSync(adapterLocation) ? adapterLocation : "@webresto/" + adapterName.toLowerCase() + "-rms-adapter";
        try {
            const adapter = require(adapterLocation);
            // why adapterName.toUpperCase() ↘
            return adapter.RMS[adapterName.toUpperCase()];
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
    static getAdapter(adapterName) {
        // if(!Boolean(adapterName)) {
        //   sails.log.warn(`Map adapter not defined: ${adapterName}`);
        //   return 
        // }
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
class MediaFileA {
    static getAdapter(adapterName) {
        // if(!Boolean(adapterName)) {
        //   sails.log.warn(`MediaFile adapter not defined: ${adapterName}`);
        //   return 
        // }
        let adapterLocation = WEBRESTO_MODULES_PATH + "/" + adapterName.toLowerCase() + "-image-adapter";
        adapterLocation = fs.existsSync(adapterLocation) ? adapterLocation : "@webresto/" + adapterName.toLowerCase() + "-image-adapter";
        try {
            const adapter = require(adapterLocation);
            return adapter.MediaFileAdapter.default;
        }
        catch (e) {
            sails.log.error("CORE > getAdapter MediaFileA > error; ", e);
            throw new Error("Module " + adapterLocation + " not found");
        }
    }
}
exports.MediaFileA = MediaFileA;
/**
 * retruns Payment-adapter
 */
class Payment {
    static getAdapter(adapterName) {
        // if(!Boolean(adapterName)) {
        //   sails.log.warn(`Payment adapter not defined: ${adapterName}`);
        //   return 
        // }
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
    static getAdapter(adapterName) {
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
