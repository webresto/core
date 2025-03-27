"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Adapter = exports.OTP = exports.Captcha = void 0;
const RMSAdapter_1 = __importDefault(require("../adapters/rms/RMSAdapter"));
const pow_1 = require("../adapters/captcha/default/pow");
const defaultOTP_1 = require("../adapters/otp/default/defaultOTP");
const local_1 = __importDefault(require("../adapters/mediafile/default/local"));
const MediaFileAdapter_1 = __importDefault(require("../adapters/mediafile/MediaFileAdapter"));
const fs = __importStar(require("fs"));
const BonusProgramAdapter_1 = __importDefault(require("../adapters/bonusprogram/BonusProgramAdapter"));
const DeliveryAdapter_1 = __importDefault(require("../adapters/delivery/DeliveryAdapter"));
const defaultDelivery_1 = require("../adapters/delivery/default/defaultDelivery");
const promotionAdapter_1 = require("../adapters/promotion/default/promotionAdapter");
// import DiscountAdapter from "./discount/AbstractDiscountAdapter";
const WEBRESTO_MODULES_PATH = process.env.WEBRESTO_MODULES_PATH === undefined ? "@webresto" : process.env.WEBRESTO_MODULES_PATH;
/**
 * returns Captcha-adapter
 */
class Captcha {
    static async getAdapter(adapterName) {
        if (!adapterName) {
            adapterName = await Settings.get("DEFAULT_CAPTCHA_ADAPTER");
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
 * returns OTP-adapter
 */
class OTP {
    /**
     * @deprecated use Adapter.getOTPAdapter instead
     * @param adapterName
     */
    static async getAdapter(adapterName) {
        return Adapter.getOTPAdapter(adapterName);
    }
}
exports.OTP = OTP;
/** TODO: move other Adapters to one class adapter */
class Adapter {
    static async getOTPAdapter(adapterName) {
        if (!adapterName) {
            adapterName = await Settings.get("DEFAULT_OTP_ADAPTER");
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
    static getPromotionAdapter(adapter, initParams) {
        let adapterName;
        if (adapter) {
            if (typeof adapter === "string") {
                adapterName = adapter;
            }
            else if (adapter instanceof promotionAdapter_1.PromotionAdapter) {
                this.instancePromotionAdapter = adapter;
                return this.instancePromotionAdapter;
            }
            else {
                throw new Error("Adapter should be a string or instance of PromotionAdapter");
            }
        }
        // Return the singleton
        if (this.instancePromotionAdapter) {
            return this.instancePromotionAdapter;
        }
        if (!adapterName) {
            this.instancePromotionAdapter = new promotionAdapter_1.PromotionAdapter;
            return this.instancePromotionAdapter;
        }
        let adapterLocation = this.WEBRESTO_MODULES_PATH + "/" + adapterName.toLowerCase() + "-promotion-adapter";
        adapterLocation = fs.existsSync(adapterLocation) ? adapterLocation : "@webresto/" + adapterName.toLowerCase() + "-promotion-adapter";
        try {
            const adapterModule = require(adapterLocation);
            this.instancePromotionAdapter = new adapterModule.PromotionAdapter(initParams);
            return this.instancePromotionAdapter;
        }
        catch (e) {
            sails.log.error("CORE > getAdapter Promotion > error; ", e);
            throw new Error("Module " + adapterLocation + " not found");
        }
    }
    /**
     * returns BonusProgram-adapter
     */
    static async getBonusProgramAdapter(adapter, initParams) {
        let adapterName;
        if (adapter) {
            if (typeof adapter === "string") {
                adapterName = adapter;
            }
            else if (adapter instanceof BonusProgramAdapter_1.default) {
                return adapter;
            }
            else {
                throw new Error("Adapter should be a string or instance of BonusProgramAdapter");
            }
        }
        if (!adapterName) {
            let defaultAdapterName = await Settings.get("DEFAULT_BONUS_ADAPTER");
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
     * returns RMS-adapter
     */
    static async getRMSAdapter(adapter, initParams) {
        // Return the singleton
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
            adapterName = await Settings.get("RMS_ADAPTER");
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
     * returns Delivery-adapter
     */
    static async getDeliveryAdapter(adapter) {
        // Return the singleton
        if (this.instanceDeliveryAdapter) {
            return this.instanceDeliveryAdapter;
        }
        if (!adapter) {
            this.instanceDeliveryAdapter = new defaultDelivery_1.DefaultDeliveryAdapter();
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
     * returns MediaFile-adapter
     */
    static async getMediaFileAdapter(adapter, initParams) {
        // Return the singleton
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
    /**
     * returns PaymentAdapter-adapter
     */
    static async getPaymentAdapter(adapterName, initParams) {
        if (!adapterName) {
            let defaultAdapterName = await Settings.get("DEFAULT_BONUS_ADAPTER");
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
exports.Adapter = Adapter;
Adapter.WEBRESTO_MODULES_PATH = process.env.WEBRESTO_MODULES_PATH === undefined ? "@webresto" : process.env.WEBRESTO_MODULES_PATH;
