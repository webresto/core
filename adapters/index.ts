import RMSAdapter, { ConfigRMSAdapter } from "./rms/RMSAdapter";
import MapAdapter from "./map/MapAdapter";
import CaptchaAdapter from "./captcha/CaptchaAdapter";
import { POW } from "./captcha/default/pow";
import { DefaultOTP } from "./otp/default/defaultOTP";
import LocalMediaFileAdapter from "./mediafile/default/local";
import OTPAdapter from "./otp/OneTimePasswordAdapter"
import MediaFileAdapter, { ConfigMediaFileAdapter } from "./mediafile/MediaFileAdapter";
import PaymentAdapter from "./payment/PaymentAdapter";
import * as fs from "fs";
import { DiscountAdapter } from "./discount/default/discountAdapter";
import BonusProgramAdapter from "./bonusprogram/BonusProgramAdapter";
import path = require("path");
// import DiscountAdapter from "./discount/AbstractDiscountAdapter";
const WEBRESTO_MODULES_PATH = process.env.WEBRESTO_MODULES_PATH === undefined ? "@webresto" : process.env.WEBRESTO_MODULES_PATH;

/**
 * // TODO: delete  getAdapter RMS after release new adapter RMS
 */ 
export class RMS {

  public static async getAdapter(adapterName: string): Promise<typeof RMSAdapter> {
    
    // if(!Boolean(adapterName)) {
    //   sails.log.warn(`RMS adapter not defined: ${adapterName}`);
    //   return 
    // }

    // For factory we use different dirrectory for modules

    if(!adapterName) {
      adapterName = await Settings.get("DEFAULT_RMS_ADAPTER") as string;
    }

    // if(!adapterName) {
    //   // RUN DUMMY ADAPTER
    // }

    let adapterLocation = WEBRESTO_MODULES_PATH + "/" + adapterName.toLowerCase() + "-rms-adapter";
    adapterLocation = fs.existsSync(adapterLocation) ? adapterLocation : "@webresto/" + adapterName.toLowerCase() + "-rms-adapter";
    try {
      const adapter = require(adapterLocation);
      return adapter.RMS.default;
    } catch (e) {
      sails.log.error("CORE > getAdapter RMS > error; ", e);
      throw new Error("Module " + adapterLocation + " not found");
    }
  }
}

/**
 * retruns Map-adapter
 */
export class Map {
  public static async getAdapter(adapterName: string): Promise<typeof MapAdapter> {

    if(!adapterName) {
      adapterName = await Settings.get("DEFAULT_MAP_ADAPTER") as string;
    }

    let adapterLocation = WEBRESTO_MODULES_PATH + "/" + adapterName.toLowerCase() + "-map-adapter";
    adapterLocation = fs.existsSync(adapterLocation) ? adapterLocation : "@webresto/" + adapterName.toLowerCase() + "-map-adapter";
    try {
      const adapter: {
        MapAdapter: { default: new (config) => MapAdapter };
      } = require(adapterLocation);
      return adapter.MapAdapter.default;
    } catch (e) {
      sails.log.error("CORE > getAdapter Map > error; ", e);
      throw new Error("Module " + adapterLocation + " not found");
    }
  }
}

/**
 * retruns Payment-adapter
 */
export class Payment {
  public static async getAdapter(adapterName: string): Promise<PaymentAdapter> {

    // if(!Boolean(adapterName)) {
    //   sails.log.warn(`Payment adapter not defined: ${adapterName}`);
    //   return 
    // }

    if(!adapterName) {
      adapterName = await Settings.get("DEFAULT_PAYMENT_ADAPTER") as string;
    }

    let adapterLocation = WEBRESTO_MODULES_PATH + "/" + adapterName.toLowerCase() + "-payment-adapter";
    adapterLocation = fs.existsSync(adapterLocation) ? adapterLocation : "@webresto/" + adapterName.toLowerCase() + "-payment-adapter";

    try {
      const adapter = require(adapterLocation);
      return adapter.PaymentAdapter[adapterName.toUpperCase()];
    } catch (e) {
      sails.log.error("CORE > getAdapter Payment > error; ", e);
      throw new Error("Module " + adapterLocation + " not found");
    }
  }
}

/**
 * retruns Captcha-adapter
 */
export class Captcha {
  public static  async getAdapter(adapterName?: string): Promise<CaptchaAdapter> {
  
    if(!adapterName) {
      adapterName = await Settings.get("DEFAULT_CAPTCHA_ADAPTER") as string;
    }

    // Use default adapter POW (crypto-puzzle)
    if (!adapterName) {
      return new POW;
    }

    let adapterLocation = WEBRESTO_MODULES_PATH + "/" + adapterName.toLowerCase() + "-captcha-adapter";
    adapterLocation = fs.existsSync(adapterLocation) ? adapterLocation : "@webresto/" + adapterName.toLowerCase() + "-captcha-adapter";

    try {
      const adapter = require(adapterLocation);
      return new adapter.CaptchaAdapter[adapterName] as CaptchaAdapter;
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
  public static async getAdapter(adapterName?: string): Promise<OTPAdapter> {
  
    if(!adapterName) {
      adapterName = await Settings.get("DEFAULT_OTP_ADAPTER") as string;
    }

    // Use default adapter POW (crypto-puzzle)
    if (!adapterName) {
      return new DefaultOTP;
    }

    let adapterLocation = WEBRESTO_MODULES_PATH + "/" + adapterName.toLowerCase() + "-otp-adapter";
    adapterLocation = fs.existsSync(adapterLocation) ? adapterLocation : "@webresto/" + adapterName.toLowerCase() + "-otp-adapter";

    try {
      const adapter = require(adapterLocation);
      return new adapter.OTPAdapter[adapterName] as OTPAdapter;
    } catch (e) {
      sails.log.error("CORE > getAdapter OTP > error; ", e);
      throw new Error("Module " + adapterLocation + " not found");
    }
  }
}

/** TODO: move other Adapters to one class adapter */
export class Adapter {
  
  // Singletons
  private static instanceRMS: RMSAdapter;
  private static instanceMF: MediaFileAdapter;

  public static async getDiscountAdapter(adapterName?: string, initParams?: {[key: string]:string | number | boolean}): Promise<DiscountAdapter> {
  
    if(!adapterName) {
      adapterName = await Settings.get("DEFAULT_DISCOUNT_ADAPTER") as string;
    }

    if (!adapterName) {
      return DiscountAdapter.getInstance();
    }

    let adapterLocation = WEBRESTO_MODULES_PATH + "/" + adapterName.toLowerCase() + "-discount-adapter";
    adapterLocation = fs.existsSync(adapterLocation) ? adapterLocation : "@webresto/" + adapterName.toLowerCase() + "-discount-adapter";

    try {
      const adapter = require(adapterLocation);
      return adapter.DiscountAdapter[adapterName].getInstance(initParams) as DiscountAdapter;
    } catch (e) {
      sails.log.error("CORE > getAdapter Discount > error; ", e);
      throw new Error("Module " + adapterLocation + " not found");
    }
  }

  /**
   * retruns BonusProgram-adapter
   */ 
  public static async getBonusProgramAdapter(adapterName?: string, initParams?: {[key: string]:string | number | boolean}): Promise<BonusProgramAdapter> {
    if(!adapterName) {
      let defaultAdapterName = await Settings.get("DEFAULT_BONUS_ADAPTER") as string;
      if (!defaultAdapterName) throw 'BonusProgramAdapter is not set '
    }

    let adapterLocation = WEBRESTO_MODULES_PATH + "/" + adapterName.toLowerCase() + "-discount-adapter";
    adapterLocation = fs.existsSync(adapterLocation) ? adapterLocation : "@webresto/" + adapterName.toLowerCase() + "-bonus-adapter";

    try {
      const adapter = require(adapterLocation);
      return adapter.BonusProgramAdapter[adapterName].getInstance(initParams) as BonusProgramAdapter;
    } catch (e) {
      sails.log.error("CORE > getAdapter Discount > error; ", e);
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
    if(adapter) {
      if(typeof adapter === "string") {
          adapterName = adapter;
      } else if(adapter instanceof RMSAdapter) {
        this.instanceRMS = adapter;
        return this.instanceRMS;
      } else {
        throw new Error("Adapter should be a string or instance of rmsadapter");
      }
    
    }

    if(!adapterName) {
      adapterName = await Settings.get("DEFAULT_RMS_ADAPTER") as string;
      if (!adapterName) throw 'RMS adapter is not installed';
    }
  

    let adapterLocation = WEBRESTO_MODULES_PATH + "/" + adapterName.toLowerCase() + "-rms-adapter";
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
   * retruns MediaFile-adapter
   */ 
    public static async getMediaFileAdapter(adapter?: string | MediaFileAdapter, initParams?: ConfigMediaFileAdapter): Promise<MediaFileAdapter> {
      // Return the singleon
      if (this.instanceMF) {
        return this.instanceMF;
      }
    
      let adapterName: string;
      if(adapter) {
        if(typeof adapter === "string") {
            adapterName = adapter;
        } else if(adapter instanceof MediaFileAdapter) {
          this.instanceMF = adapter;
          return this.instanceMF;
        } else {
          throw new Error("Adapter should be a string or instance of rmsadapter");
        }
      
      }
  
      let adapterLocation: string = "";

      if(!adapterName) {
        adapterName = await Settings.get("DEFAULT_MEDIAFILE_ADAPTER") as string;
        if (!adapterName) {
          this.instanceMF = new LocalMediaFileAdapter(initParams);
          return this.instanceMF;
        }
      }
    
      if (!adapterLocation) {
        adapterLocation = WEBRESTO_MODULES_PATH + "/" + adapterName.toLowerCase() + "-mediafile-adapter";
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
}