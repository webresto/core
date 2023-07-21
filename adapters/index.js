"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Adapter = exports.OTP = exports.Captcha = exports.Payment = exports.Map = exports.RMS = void 0;
const RMSAdapter_1 = require("./rms/RMSAdapter");
const pow_1 = require("./captcha/default/pow");
const defaultOTP_1 = require("./otp/default/defaultOTP");
const local_1 = require("./mediafile/default/local");
const MediaFileAdapter_1 = require("./mediafile/MediaFileAdapter");
const fs = require("fs");
const discountAdapter_1 = require("./discount/default/discountAdapter");
// import DiscountAdapter from "./discount/AbstractDiscountAdapter";
const WEBRESTO_MODULES_PATH = process.env.WEBRESTO_MODULES_PATH === undefined ? "@webresto" : process.env.WEBRESTO_MODULES_PATH;
/**
 * // TODO: delete  getAdapter RMS after release new adapter RMS
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
/** TODO: move other Adapters to one class adapter */
class Adapter {
    static async getDiscountAdapter(adapterName, initParams) {
        if (!adapterName) {
            adapterName = await Settings.get("DEFAULT_DISCOUNT_ADAPTER");
        }
        if (!adapterName) {
            return discountAdapter_1.DiscountAdapter.getInstance();
        }
        let adapterLocation = this.WEBRESTO_MODULES_PATH + "/" + adapterName.toLowerCase() + "-discount-adapter";
        adapterLocation = fs.existsSync(adapterLocation) ? adapterLocation : "@webresto/" + adapterName.toLowerCase() + "-discount-adapter";
        try {
            const adapter = require(adapterLocation);
            return adapter.DiscountAdapter[adapterName].getInstance(initParams);
        }
        catch (e) {
            sails.log.error("CORE > getAdapter Discount > error; ", e);
            throw new Error("Module " + adapterLocation + " not found");
        }
    }
    /**
     * retruns BonusProgram-adapter
     */
    static async getBonusProgramAdapter(adapterName, initParams) {
        if (!adapterName) {
            let defaultAdapterName = await Settings.get("DEFAULT_BONUS_ADAPTER");
            if (!defaultAdapterName)
                throw 'BonusProgramAdapter is not set ';
        }
        let adapterLocation = this.WEBRESTO_MODULES_PATH + "/" + adapterName.toLowerCase() + "-discount-adapter";
        adapterLocation = fs.existsSync(adapterLocation) ? adapterLocation : "@webresto/" + adapterName.toLowerCase() + "-bonus-adapter";
        try {
            const adapter = require(adapterLocation);
            return adapter.BonusProgramAdapter[adapterName].getInstance(initParams);
        }
        catch (e) {
            sails.log.error("CORE > getAdapter Discount > error; ", e);
            throw new Error("Module " + adapterLocation + " not found");
        }
    }
    /**
     * retruns RMS-adapter
     */
    static async getRMSAdapter(adapter, initParams) {
        // Return the singleon
        if (this.instanceRMS) {
            return this.instanceRMS;
        }
        let adapterName;
        if (adapter) {
            if (typeof adapter === "string") {
                adapterName = adapter;
            }
            else if (adapter instanceof RMSAdapter_1.default) {
                this.instanceRMS = adapter;
                return this.instanceRMS;
            }
            else {
                throw new Error("Adapter should be a string or instance of rmsadapter");
            }
        }
        if (!adapterName) {
            adapterName = await Settings.get("DEFAULT_RMS_ADAPTER");
            if (!adapterName)
                throw 'RMS adapter is not installed';
        }
        let adapterLocation = this.WEBRESTO_MODULES_PATH + "/" + adapterName.toLowerCase() + "-rms-adapter";
        adapterLocation = fs.existsSync(adapterLocation) ? adapterLocation : "@webresto/" + adapterName.toLowerCase() + "-rms-adapter";
        try {
            const adapterModule = require(adapterLocation);
            this.instanceRMS = new adapterModule.RMSAdapter(initParams);
            return this.instanceRMS;
        }
        catch (e) {
            sails.log.error("CORE > getAdapter RMS >  error; ", e);
            throw new Error("Module " + adapterLocation + " not found");
        }
    }
    /**
   * retruns MediaFile-adapter
   */
    static async getMediaFileAdapter(adapter, initParams) {
        // Return the singleon
        if (this.instanceMF) {
            return this.instanceMF;
        }
        let adapterName;
        if (adapter) {
            if (typeof adapter === "string") {
                adapterName = adapter;
            }
            else if (adapter instanceof MediaFileAdapter_1.default) {
                this.instanceMF = adapter;
                return this.instanceMF;
            }
            else {
                throw new Error("Adapter should be a string or instance of rmsadapter");
            }
        }
        let adapterLocation = "";
        if (!adapterName) {
            adapterName = await Settings.get("DEFAULT_MEDIAFILE_ADAPTER");
            if (!adapterName) {
                this.instanceMF = new local_1.default(initParams);
                return this.instanceMF;
            }
        }
        if (!adapterLocation) {
            adapterLocation = this.WEBRESTO_MODULES_PATH + "/" + adapterName.toLowerCase() + "-mediafile-adapter";
            adapterLocation = fs.existsSync(adapterLocation) ? adapterLocation : "@webresto/" + adapterName.toLowerCase() + "-mediafile-adapter";
        }
        try {
            const adapterModule = require(adapterLocation);
            this.instanceMF = new adapterModule.MediaFileAdapter(initParams);
            return this.instanceMF;
        }
        catch (e) {
            sails.log.error("CORE > getAdapter MediaFile >  error; ", e);
            throw new Error("Module " + adapterLocation + " not found");
        }
    }
}
Adapter.WEBRESTO_MODULES_PATH = process.env.WEBRESTO_MODULES_PATH === undefined ? "@webresto" : process.env.WEBRESTO_MODULES_PATH;
exports.Adapter = Adapter;
