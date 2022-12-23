import RMSAdapter from "./rms/RMSAdapter";
import MapAdapter from "./map/MapAdapter";
import CaptchaAdapter from "./captcha/CaptchaAdapter";
import { POW } from "./captcha/default/pow";

import MediaFileAdapter from "./mediafile/MediaFileAdapter";
import PaymentAdapter from "./payment/PaymentAdapter";
import * as fs from "fs";
const WEBRESTO_MODULES_PATH = process.env.WEBRESTO_MODULES_PATH === undefined ? "@webresto" : process.env.WEBRESTO_MODULES_PATH;

/**
 * retruns RMS-adapter
 */ 
export class RMS {
  public static getAdapter(adapterName: string): typeof RMSAdapter {
    
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
  public static getAdapter(adapterName: string): new (config) => MapAdapter {

    // if(!Boolean(adapterName)) {
    //   sails.log.warn(`Map adapter not defined: ${adapterName}`);
    //   return 
    // }

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
export class MediaFileA {
  public static getAdapter(adapterName: string): MediaFileAdapter {

    // if(!Boolean(adapterName)) {
    //   sails.log.warn(`MediaFile adapter not defined: ${adapterName}`);
    //   return 
    // }

    let adapterLocation = WEBRESTO_MODULES_PATH + "/" + adapterName.toLowerCase() + "-image-adapter";
    adapterLocation = fs.existsSync(adapterLocation) ? adapterLocation : "@webresto/" + adapterName.toLowerCase() + "-image-adapter";
    try {
      const adapter = require(adapterLocation);
      return adapter.MediaFileAdapter.default;
    } catch (e) {
      sails.log.error("CORE > getAdapter MediaFileA > error; ", e);
      throw new Error("Module " + adapterLocation + " not found");
    }
  }
}

/**
 * retruns Payment-adapter
 */
export class Payment {
  public static getAdapter(adapterName: string): PaymentAdapter {

    // if(!Boolean(adapterName)) {
    //   sails.log.warn(`Payment adapter not defined: ${adapterName}`);
    //   return 
    // }


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
  public static getAdapter(adapterName?: string): CaptchaAdapter {
  
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
