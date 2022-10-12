import RMSAdapter from "./rms/RMSAdapter";
import MapAdapter from "./map/MapAdapter";
import ImageAdapter from "./image/ImageAdapter";
import PaymentAdapter from "./payment/PaymentAdapter";
import * as fs from "fs";
const WEBRESTO_MODULES_PATH = process.env.WEBRESTO_MODULES_PATH === undefined ? "@webresto" : process.env.WEBRESTO_MODULES_PATH;
/**
 * Отдаёт запрашиваемый RMS-адаптер
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
      return adapter.RMS[adapterName.toUpperCase()];
    } catch (e) {
      sails.log.error("CORE > getAdapter RMS > error; ", e);
      throw new Error("Module " + adapterLocation + " not found");
    }
  }
}

/**
 * Отдаёт запрашиваемый Map-адаптер
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
 * Отдаёт запрашиваемый Image-адаптер
 */
export class ImageA {
  public static getAdapter(adapterName: string): ImageAdapter {

    // if(!Boolean(adapterName)) {
    //   sails.log.warn(`Image adapter not defined: ${adapterName}`);
    //   return 
    // }

    let adapterLocation = WEBRESTO_MODULES_PATH + "/" + adapterName.toLowerCase() + "-image-adapter";
    adapterLocation = fs.existsSync(adapterLocation) ? adapterLocation : "@webresto/" + adapterName.toLowerCase() + "-image-adapter";
    try {
      const adapter = require(adapterLocation);
      return adapter.ImageAdapter.default;
    } catch (e) {
      sails.log.error("CORE > getAdapter ImageA > error; ", e);
      throw new Error("Module " + adapterLocation + " not found");
    }
  }
}
/**
 * Отдаёт запрашиваемый Payment-адаптер
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
