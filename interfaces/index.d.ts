import RMSAdapter, { ConfigRMSAdapter } from "../adapters/rms/RMSAdapter";
import CaptchaAdapter from "../adapters/captcha/CaptchaAdapter";
import OTPAdapter from "../adapters/otp/OneTimePasswordAdapter";
import MediaFileAdapter, { ConfigMediaFileAdapter } from "../adapters/mediafile/MediaFileAdapter";
import PaymentAdapter from "../adapters/payment/PaymentAdapter";
import BonusProgramAdapter from "../adapters/bonusprogram/BonusProgramAdapter";
import { Config } from "./Config";
import DeliveryAdapter from "../adapters/delivery/DeliveryAdapter";
import { PromotionAdapter } from "../adapters/promotion/default/promotionAdapter";
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
    /**
     * @deprecated use Adapter.getOTPAdapter instead
     * @param adapterName
     */
    static getAdapter(adapterName?: string): Promise<OTPAdapter>;
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
     * retruns BonusProgram-adapter
     */
    static getBonusProgramAdapter(adapter?: string | BonusProgramAdapter, initParams?: {
        [key: string]: string | number | boolean;
    }): Promise<BonusProgramAdapter>;
    /**
     * retruns RMS-adapter
     */
    static getRMSAdapter(adapter?: string | RMSAdapter, initParams?: ConfigRMSAdapter): Promise<RMSAdapter>;
    /**
     * retruns Delivery-adapter
     */
    static getDeliveryAdapter(adapter?: string | DeliveryAdapter): Promise<DeliveryAdapter>;
    /**
     * retruns MediaFile-adapter
     */
    static getMediaFileAdapter(adapter?: string | MediaFileAdapter, initParams?: ConfigMediaFileAdapter): Promise<MediaFileAdapter>;
    /**
     * retruns PaymentAdapter-adapter
     */
    static getPaymentAdapter(adapterName?: string, initParams?: Config): Promise<PaymentAdapter>;
}
