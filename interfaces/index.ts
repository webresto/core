import RMSAdapter, { ConfigRMSAdapter } from "../adapters/rms/RMSAdapter";
import MapAdapter from "../adapters/map/MapAdapter";
import CaptchaAdapter from "../adapters/captcha/CaptchaAdapter";
import { POW } from "../adapters/captcha/default/pow";
import { DefaultOTP } from "../adapters/otp/default/defaultOTP";
import LocalMediaFileAdapter from "../adapters/mediafile/default/local";
import OTPAdapter from "../adapters/otp/OneTimePasswordAdapter";
import MediaFileAdapter, { ConfigMediaFileAdapter } from "../adapters/mediafile/MediaFileAdapter";
import PaymentAdapter from "../adapters/payment/PaymentAdapter";
import * as fs from "fs";
import BonusProgramAdapter from "../adapters/bonusprogram/BonusProgramAdapter";
import path = require("path");
import { Config } from "./Config";
import DeliveryAdapter from "../adapters/delivery/DeliveryAdapter";
import { DefaultDeliveryAdapter } from "../adapters/delivery/default/defaultDelivery";
import { PromotionAdapter } from "../adapters/promotion/default/promotionAdapter";
// import DiscountAdapter from "./discount/AbstractDiscountAdapter";
const WEBRESTO_MODULES_PATH = process.env.WEBRESTO_MODULES_PATH === undefined ? "@webresto" : process.env.WEBRESTO_MODULES_PATH;


/**
 * retruns Captcha-adapter
 */
export class Captcha {
  public static async getAdapter(adapterName?: string): Promise<CaptchaAdapter> {
    if (!adapterName) {
      adapterName = (await Settings.get("DEFAULT_CAPTCHA_ADAPTER")) as string;
    }

    // Use default adapter POW (crypto-puzzle)
    if (!adapterName) {
      return new POW();
    }

    let adapterLocation = WEBRESTO_MODULES_PATH + "/" + adapterName.toLowerCase() + "-captcha-adapter";
    adapterLocation = fs.existsSync(adapterLocation) ? adapterLocation : "@webresto/" + adapterName.toLowerCase() + "-captcha-adapter";

    try {
      const adapter = require(adapterLocation);
      return new adapter.CaptchaAdapter[adapterName]() as CaptchaAdapter;
    } catch (e) {
      sails.log.error("CORE > getAdapter Captcha > error; ", e);
      throw new Error("Module " + adapterLocation + " not found");
    }
  }
}

/**
 * retruns OTP-adapter
 */
export class OTP {
  /**
   * @deprecated use Adapter.getOTPAdapter instead
   * @param adapterName 
   */
  public static async getAdapter(adapterName?: string): Promise<OTPAdapter> {
    return Adapter.getOTPAdapter(adapterName);
  }
}

/** TODO: move other Adapters to one class adapter */
export class Adapter {
  // Singletons
  private static instanceRMS: RMSAdapter;
  private static instancePromotionAdapter: PromotionAdapter;
  private static instanceDeliveryAdapter: DeliveryAdapter;
  private static instanceMF: MediaFileAdapter;

  public static WEBRESTO_MODULES_PATH = process.env.WEBRESTO_MODULES_PATH === undefined ? "@webresto" : process.env.WEBRESTO_MODULES_PATH;
  
  public static async getOTPAdapter(adapterName?: string): Promise<OTPAdapter> {
    if (!adapterName) {
      adapterName = (await Settings.get("DEFAULT_OTP_ADAPTER")) as string;
    }

    // Use default adapter POW (crypto-puzzle)
    if (!adapterName) {
      return new DefaultOTP();
    }

    let adapterLocation = WEBRESTO_MODULES_PATH + "/" + adapterName.toLowerCase() + "-otp-adapter";
    adapterLocation = fs.existsSync(adapterLocation) ? adapterLocation : "@webresto/" + adapterName.toLowerCase() + "-otp-adapter";

    try {
      const adapter = require(adapterLocation);
      return new adapter.OTPAdapter[adapterName]() as OTPAdapter;
    } catch (e) {
      sails.log.error("CORE > getAdapter OTP > error; ", e);
      throw new Error("Module " + adapterLocation + " not found");
    }
  }
  
  public static getPromotionAdapter(adapter?: string | PromotionAdapter, initParams?: {[key: string]:string | number | boolean}): PromotionAdapter {

    let adapterName: string;
    if (adapter) {
      if (typeof adapter === "string") {
        adapterName = adapter;
      } else if (adapter instanceof PromotionAdapter) {
        this.instancePromotionAdapter = adapter;
        return this.instancePromotionAdapter;
      } else {
        throw new Error("Adapter should be a string or instance of PromotionAdapter");
      }
    }

    // Return the singleon
    if (this.instancePromotionAdapter) {
      return this.instancePromotionAdapter;
    }

    if (!adapterName) {
      this.instancePromotionAdapter = new PromotionAdapter;
      return this.instancePromotionAdapter
    }

    let adapterLocation = this.WEBRESTO_MODULES_PATH + "/" + adapterName.toLowerCase() + "-promotion-adapter";
    adapterLocation = fs.existsSync(adapterLocation) ? adapterLocation : "@webresto/" + adapterName.toLowerCase() + "-promotion-adapter";

    try {
      const adapterModule = require(adapterLocation);
      this.instancePromotionAdapter = new adapterModule.PromotionAdapter(initParams);
      return this.instancePromotionAdapter;
    } catch (e) {
      sails.log.error("CORE > getAdapter Promotion > error; ", e);
      throw new Error("Module " + adapterLocation + " not found");
    }
  }

  /**
   * retruns BonusProgram-adapter
   */
  public static async getBonusProgramAdapter(adapter?: string | BonusProgramAdapter, initParams?: { [key: string]: string | number | boolean }): Promise<BonusProgramAdapter> {
    
    let adapterName: string;
    if (adapter) {
      if (typeof adapter === "string") {
        adapterName = adapter;
      } else if (adapter instanceof BonusProgramAdapter) {
        return adapter;
      } else {
        throw new Error("Adapter should be a string or instance of BonusProgramAdapter");
      }
    }

    if (!adapterName) {
      let defaultAdapterName = (await Settings.get("DEFAULT_BONUS_ADAPTER")) as string;
      if (!defaultAdapterName) throw "BonusProgramAdapter is not set ";
    }

    let adapterLocation = this.WEBRESTO_MODULES_PATH + "/" + adapterName.toLowerCase() + "-bonus-adapter";
    adapterLocation = fs.existsSync(adapterLocation) ? adapterLocation : "@webresto/" + adapterName.toLowerCase() + "-bonus-adapter";

    try {
      const adapter = require(adapterLocation);
      return adapter.BonusProgramAdapter[adapterName].getInstance(initParams) as BonusProgramAdapter;
    } catch (e) {
      sails.log.error("CORE > getAdapter Bonus > error; ", e);
      throw new Error("Module " + adapterLocation + " not found");
    }
  }

  /**
   * retruns RMS-adapter
   */
  public static async getRMSAdapter(adapter?: string | RMSAdapter, initParams?: ConfigRMSAdapter): Promise<RMSAdapter> {
    // Return the singleon
    if (this.instanceRMS) {
      return this.instanceRMS;
    }

    let adapterName: string;
    if (adapter) {
      if (typeof adapter === "string") {
        adapterName = adapter;
      } else if (adapter instanceof RMSAdapter) {
        this.instanceRMS = adapter;
        return this.instanceRMS;
      } else {
        throw new Error("Adapter should be a string or instance of rmsadapter");
      }
    }

    if (!adapterName) {
      adapterName = (await Settings.get("RMS_ADAPTER")) as string;
      if (!adapterName) throw "RMS adapter is not installed";
    }

    let adapterLocation = this.WEBRESTO_MODULES_PATH + "/" + adapterName.toLowerCase() + "-rms-adapter";
    adapterLocation = fs.existsSync(adapterLocation) ? adapterLocation : "@webresto/" + adapterName.toLowerCase() + "-rms-adapter";

    try {
      const adapterModule = require(adapterLocation);
      this.instanceRMS = new adapterModule.RMSAdapter(initParams);
      return this.instanceRMS;
    } catch (e) {
      sails.log.error("CORE > getAdapter RMS >  error; ", e);
      throw new Error("Module " + adapterLocation + " not found");
    }
  }

  /**
   * retruns Delivery-adapter
   */
  public static async getDeliveryAdapter(adapter?: string | DeliveryAdapter): Promise<DeliveryAdapter> {
    // Return the singleon
    if (this.instanceDeliveryAdapter) {
      return this.instanceDeliveryAdapter;
    }

    if (!adapter) {
      this.instanceDeliveryAdapter = new DefaultDeliveryAdapter();
      return this.instanceDeliveryAdapter;
    }

    let adapterName: string;
    if (adapter) {
      if (typeof adapter === "string") {
        adapterName = adapter;
      } else if (adapter instanceof DeliveryAdapter) {
        console.log(">>>")
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
    } catch (e) {
      sails.log.error("CORE > getAdapter Delivery adapter >  error; ", e);
      throw new Error("Module " + adapterLocation + " not found");
    }
  }

  /**
   * retruns MediaFile-adapter
   */
  public static async getMediaFileAdapter(adapter?: string | MediaFileAdapter, initParams?: ConfigMediaFileAdapter): Promise<MediaFileAdapter> {
    // Return the singleon
    if (this.instanceMF) {
      return this.instanceMF;
    }

    let adapterName: string;
    if (adapter) {
      if (typeof adapter === "string") {
        adapterName = adapter;
      } else if (adapter instanceof MediaFileAdapter) {
        this.instanceMF = adapter;
        return this.instanceMF;
      } else {
        throw new Error("Adapter should be a string or instance of rmsadapter");
      }
    }

    let adapterLocation: string = "";

    if (!adapterName) {
      adapterName = (await Settings.get("DEFAULT_MEDIAFILE_ADAPTER")) as string;
      if (!adapterName) {
        this.instanceMF = new LocalMediaFileAdapter(initParams);
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
    } catch (e) {
      sails.log.error("CORE > getAdapter MediaFile >  error; ", e);
      throw new Error("Module " + adapterLocation + " not found");
    }
  }

  /**
   * retruns PaymentAdapter-adapter
   */
  public static async getPaymentAdapter(adapterName?: string, initParams?: Config): Promise<PaymentAdapter> {
    if (!adapterName) {
      let defaultAdapterName = (await Settings.get("DEFAULT_BONUS_ADAPTER")) as string;
      if (!defaultAdapterName) throw "BonusProgramAdapter is not set ";
    }

    let adapterLocation = this.WEBRESTO_MODULES_PATH + "/" + adapterName.toLowerCase() + "-payment-adapter";
    adapterLocation = fs.existsSync(adapterLocation) ? adapterLocation : "@webresto/" + adapterName.toLowerCase() + "-payment-adapter";

    try {
      const adapter = require(adapterLocation);
      return adapter.PaymentProgramAdapter[adapterName].getInstance(initParams) as PaymentAdapter;
    } catch (e) {
      sails.log.error("CORE > getAdapter Payment > error; ", e);
      throw new Error("Module " + adapterLocation + " not found");
    }
  }
}
