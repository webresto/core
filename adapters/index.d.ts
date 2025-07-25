import RMSAdapter, { ConfigRMSAdapter } from "./rms/RMSAdapter";
import CaptchaAdapter from "./captcha/CaptchaAdapter";
import OTPAdapter from "./otp/OneTimePasswordAdapter";
import MediaFileAdapter, { ConfigMediaFileAdapter } from "./mediafile/MediaFileAdapter";
import PaymentAdapter from "./payment/PaymentAdapter";
import BonusProgramAdapter from "./bonusprogram/BonusProgramAdapter";
import { Config } from "../interfaces/Config";
import DeliveryAdapter from "./delivery/DeliveryAdapter";
import { PromotionAdapter } from "./promotion/default/promotionAdapter";
/**
 * returns Captcha-adapter
 */
export declare class Captcha {
    static getAdapter(adapterName?: string): Promise<CaptchaAdapter>;
}
/**
 * returns OTP-adapter
 */
export declare class OTP {
    /**
     * @deprecated use Adapter.getOTPAdapter instead
     * @param adapterName
     */
    static getAdapter(adapterName?: string): Promise<OTPAdapter>;
}
export declare class Delivery {
    static instanceDeliveryAdapter: DeliveryAdapter;
    /**
     * returns Delivery-adapter
     */
    static getAdapter(adapter?: string | DeliveryAdapter): Promise<DeliveryAdapter>;
}
/** TODO: move other Adapters to one class adapter */
export declare class Adapter {
    private static instanceRMS;
    private static instancePromotionAdapter;
    private static instanceDeliveryAdapter;
    private static instanceMF;
    static WEBRESTO_MODULES_PATH: string;
    static getOTPAdapter(adapterName?: string): Promise<OTPAdapter>;
    static getPromotionAdapter(adapter?: string | PromotionAdapter, initParams?: {
        [key: string]: string | number | boolean;
    }): PromotionAdapter;
    /**
     * returns BonusProgram-adapter
     */
    static getBonusProgramAdapter(adapter?: string | BonusProgramAdapter, initParams?: {
        [key: string]: string | number | boolean;
    }): Promise<BonusProgramAdapter>;
    /**
     * returns RMS-adapter
     */
    static getRMSAdapter(adapter?: string | RMSAdapter, initParams?: ConfigRMSAdapter): Promise<RMSAdapter>;
    /**
     * returns Delivery-adapter
     * @deprecated use Class Delivery istead
     */
    static getDeliveryAdapter(adapter?: string | DeliveryAdapter): Promise<DeliveryAdapter>;
    /**
     * returns MediaFile-adapter
     */
    static getMediaFileAdapter(adapter?: string | MediaFileAdapter, initParams?: ConfigMediaFileAdapter): Promise<MediaFileAdapter>;
    /**
     * returns PaymentAdapter-adapter
     */
    static getPaymentAdapter(adapterName?: string, initParams?: Config): Promise<PaymentAdapter>;
}
