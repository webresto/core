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
