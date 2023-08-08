"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Adapter = exports.OTP = exports.Captcha = void 0;
const RMSAdapter_1 = require("./rms/RMSAdapter");
const pow_1 = require("./captcha/default/pow");
const defaultOTP_1 = require("./otp/default/defaultOTP");
const local_1 = require("./mediafile/default/local");
const MediaFileAdapter_1 = require("./mediafile/MediaFileAdapter");
const fs = require("fs");
const DeliveryAdapter_1 = require("./delivery/DeliveryAdapter");
const defaultDelivery_1 = require("./delivery/default/defaultDelivery");
const promotionAdapter_1 = require("./promotion/default/promotionAdapter");
// import DiscountAdapter from "./discount/AbstractDiscountAdapter";
const WEBRESTO_MODULES_PATH = process.env.WEBRESTO_MODULES_PATH === undefined ? "@webresto" : process.env.WEBRESTO_MODULES_PATH;
/**
 * retruns Captcha-adapter
 */
class Captcha {
    static async getAdapter(adapterName) {
        if (!adapterName) {
            adapterName = (await Settings.get("DEFAULT_CAPTCHA_ADAPTER"));
        }
        // Use default adapter POW (crypto-puzzle)
        if (!adapterName) {
            return new pow_1.POW();
        }
        let adapterLocation = WEBRESTO_MODULES_PATH + "/" + adapterName.toLowerCase() + "-captcha-adapter";
        adapterLocation = fs.existsSync(adapterLocation) ? adapterLocation : "@webresto/" + adapterName.toLowerCase() + "-captcha-adapter";
        try {
            const adapter = require(adapterLocation);
            return new adapter.CaptchaAdapter[adapterName]();
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
            adapterName = (await Settings.get("DEFAULT_OTP_ADAPTER"));
        }
        // Use default adapter POW (crypto-puzzle)
        if (!adapterName) {
            return new defaultOTP_1.DefaultOTP();
        }
        let adapterLocation = WEBRESTO_MODULES_PATH + "/" + adapterName.toLowerCase() + "-otp-adapter";
        adapterLocation = fs.existsSync(adapterLocation) ? adapterLocation : "@webresto/" + adapterName.toLowerCase() + "-otp-adapter";
        try {
            const adapter = require(adapterLocation);
            return new adapter.OTPAdapter[adapterName]();
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
    static async getPromotionAdapter(adapterName, initParams) {
        if (!adapterName) {
            adapterName = await Settings.get("DEFAULT_PROMOTION_ADAPTER");
        }
        if (!adapterName) {
            return promotionAdapter_1.PromotionAdapter.initialize();
        }
        let adapterLocation = this.WEBRESTO_MODULES_PATH + "/" + adapterName.toLowerCase() + "-promotion-adapter";
        adapterLocation = fs.existsSync(adapterLocation) ? adapterLocation : "@webresto/" + adapterName.toLowerCase() + "-promotion-adapter";
        try {
            const adapter = require(adapterLocation);
            return adapter.PromotionAdapter[adapterName].initialize(initParams);
        }
        catch (e) {
            sails.log.error("CORE > getAdapter Promotion > error; ", e);
            throw new Error("Module " + adapterLocation + " not found");
        }
    }
    /**
     * retruns BonusProgram-adapter
     */
    static async getBonusProgramAdapter(adapterName, initParams) {
        if (!adapterName) {
            let defaultAdapterName = (await Settings.get("DEFAULT_BONUS_ADAPTER"));
            if (!defaultAdapterName)
                throw "BonusProgramAdapter is not set ";
        }
        let adapterLocation = this.WEBRESTO_MODULES_PATH + "/" + adapterName.toLowerCase() + "-bonus-adapter";
        adapterLocation = fs.existsSync(adapterLocation) ? adapterLocation : "@webresto/" + adapterName.toLowerCase() + "-bonus-adapter";
        try {
            const adapter = require(adapterLocation);
            return adapter.BonusProgramAdapter[adapterName].getInstance(initParams);
        }
        catch (e) {
            sails.log.error("CORE > getAdapter Bonus > error; ", e);
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
            adapterName = (await Settings.get("RMS_ADAPTER"));
            if (!adapterName)
                throw "RMS adapter is not installed";
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
     * retruns Delivery-adapter
     */
    static async getDeliveryAdapter(adapter) {
        // Return the singleon
        if (this.instanceDeliveryAdapter) {
            return this.instanceDeliveryAdapter;
        }
        let adapterName;
        if (adapter) {
            if (typeof adapter === "string") {
                adapterName = adapter;
            }
            else if (adapter instanceof DeliveryAdapter_1.default) {
                this.instanceDeliveryAdapter = adapter;
                return this.instanceDeliveryAdapter;
            }
            else {
                this.instanceDeliveryAdapter = new defaultDelivery_1.DefaultDeliveryAdapter();
                return this.instanceDeliveryAdapter;
            }
        }
        if (!adapterName) {
            adapterName = (await Settings.get("DELIVERY_ADAPTER"));
            if (!adapterName)
                throw "DELIVERY adapter is not installed";
        }
        let adapterLocation = fs.existsSync(this.WEBRESTO_MODULES_PATH + "/" + adapterName.toLowerCase() + "-delivery-adapter")
            ? this.WEBRESTO_MODULES_PATH + "/" + adapterName.toLowerCase() + "-delivery-adapter"
            : fs.existsSync("@webresto/" + adapterName.toLowerCase() + "-delivery-adapter")
                ? "@webresto/" + adapterName.toLowerCase() + "-delivery-adapter"
                : adapterName;
        try {
            const adapterModule = require(adapterLocation);
            this.instanceDeliveryAdapter = new adapterModule.DeliveryAdapter();
            return this.instanceDeliveryAdapter;
        }
        catch (e) {
            sails.log.error("CORE > getAdapter Delivery adapter >  error; ", e);
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
            adapterName = (await Settings.get("DEFAULT_MEDIAFILE_ADAPTER"));
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
    /**
     * retruns PaymentAdapter-adapter
     */
    static async getPaymentAdapter(adapterName, initParams) {
        if (!adapterName) {
            let defaultAdapterName = (await Settings.get("DEFAULT_BONUS_ADAPTER"));
            if (!defaultAdapterName)
                throw "BonusProgramAdapter is not set ";
        }
        let adapterLocation = this.WEBRESTO_MODULES_PATH + "/" + adapterName.toLowerCase() + "-payment-adapter";
        adapterLocation = fs.existsSync(adapterLocation) ? adapterLocation : "@webresto/" + adapterName.toLowerCase() + "-payment-adapter";
        try {
            const adapter = require(adapterLocation);
            return adapter.PaymentProgramAdapter[adapterName].getInstance(initParams);
        }
        catch (e) {
            sails.log.error("CORE > getAdapter Payment > error; ", e);
            throw new Error("Module " + adapterLocation + " not found");
        }
    }
}
Adapter.WEBRESTO_MODULES_PATH = process.env.WEBRESTO_MODULES_PATH === undefined ? "@webresto" : process.env.WEBRESTO_MODULES_PATH;
exports.Adapter = Adapter;
