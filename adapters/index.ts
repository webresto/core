import RMSAdapter from "./rms/RMSAdapter";
import MapAdapter from "./map/MapAdapter";
import CaptchaAdapter from "./captcha/CaptchaAdapter";
import { POW } from "./captcha/default/pow";
import * as LocalMediaFileAdapter from "./mediafile/default/im-local"
import { DefaultOTP } from "./otp/default/defaultOTP";
import OTPAdapter from "./otp/OneTimePasswordAdapter"
import MediaFileAdapter from "./mediafile/MediaFileAdapter";
import PaymentAdapter from "./payment/PaymentAdapter";
import * as fs from "fs";
const WEBRESTO_MODULES_PATH = process.env.WEBRESTO_MODULES_PATH === undefined ? "@webresto" : process.env.WEBRESTO_MODULES_PATH;

/**
 * retruns RMS-adapter
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
      return adapter.RMSAdapter.default;
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
 * retruns MediaFile-adapter
 */
export class Media {
  public static async getAdapter(adapterName: string): Promise<MediaFileAdapter> {

    // if(!Boolean(adapterName)) {
    //   sails.log.warn(`MediaFile adapter not defined: ${adapterName}`);
    //   return 
    // }

    if(!adapterName) {
      adapterName = await Settings.get("MEDIAFILE_ADAPTER") as string;
    }
    let adapter: {MediaFileAdapter: {default: MediaFileAdapter}}
    // Use default adapter local Imagemagick
    if (!adapterName || "imagemagick-local") {
      adapter = require("./mediafile/default/im-local");
    } else {
      let adapterLocation = WEBRESTO_MODULES_PATH + "/" + adapterName.toLowerCase() + "-image-adapter";
      adapterLocation = fs.existsSync(adapterLocation) ? adapterLocation : "@webresto/" + adapterName.toLowerCase() + "-image-adapter";
      try {
        adapter = require(adapterLocation);
      } catch (e) {
        sails.log.error("CORE > getAdapter MediaFileA > error; ", e);
        throw new Error("Module " + adapterLocation + " not found");
      }
    }
    return adapter.MediaFileAdapter.default;
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

