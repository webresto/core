import RMSAdapter, { ConfigRMSAdapter } from "./rms/RMSAdapter";
import MapAdapter from "./map/MapAdapter";
import CaptchaAdapter from "./captcha/CaptchaAdapter";
import OTPAdapter from "./otp/OneTimePasswordAdapter";
import MediaFileAdapter, { ConfigMediaFileAdapter } from "./mediafile/MediaFileAdapter";
import PaymentAdapter from "./payment/PaymentAdapter";
import { DiscountAdapter } from "./discount/default/discountAdapter";
import BonusProgramAdapter from "./bonusprogram/BonusProgramAdapter";
import { Config } from "../interfaces/Config";
/**
 * retruns Map-adapter
 */
export declare class Map {
    static getAdapter(adapterName: string): Promise<typeof MapAdapter>;
}
/**
 * retruns Captcha-adapter
 */
export declare class Captcha {
    static getAdapter(adapterName?: string): Promise<CaptchaAdapter>;
}
/**
 * retruns OTP-adapter
 */
export declare class OTP {
    static getAdapter(adapterName?: string): Promise<OTPAdapter>;
}
/** TODO: move other Adapters to one class adapter */
export declare class Adapter {
    private static instanceRMS;
    private static instanceMF;
    static WEBRESTO_MODULES_PATH: string;
    static getDiscountAdapter(adapterName?: string, initParams?: {
        [key: string]: string | number | boolean;
    }): Promise<DiscountAdapter>;
    /**
     * retruns BonusProgram-adapter
     */
    static getBonusProgramAdapter(adapterName?: string, initParams?: {
        [key: string]: string | number | boolean;
    }): Promise<BonusProgramAdapter>;
    /**
     * retruns RMS-adapter
     */
    static getRMSAdapter(adapter?: string | RMSAdapter, initParams?: ConfigRMSAdapter): Promise<RMSAdapter>;
    /**
   * retruns MediaFile-adapter
   */
    static getMediaFileAdapter(adapter?: string | MediaFileAdapter, initParams?: ConfigMediaFileAdapter): Promise<MediaFileAdapter>;
    /**
     * retruns PaymentAdapter-adapter
     */
    static getPaymentAdapter(adapterName?: string, initParams?: Config): Promise<PaymentAdapter>;
}
