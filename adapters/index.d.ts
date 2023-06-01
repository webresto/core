import RMSAdapter from "./rms/RMSAdapter";
import MapAdapter from "./map/MapAdapter";
import CaptchaAdapter from "./captcha/CaptchaAdapter";
import OTPAdapter from "./otp/OneTimePasswordAdapter";
import MediaFileAdapter from "./mediafile/MediaFileAdapter";
import PaymentAdapter from "./payment/PaymentAdapter";
import { DiscountAdapter } from "./discount/default/discountAdapter";
/**
 * retruns RMS-adapter
 */
export declare class RMS {
    static getAdapter(adapterName: string): Promise<typeof RMSAdapter>;
}
/**
 * retruns Map-adapter
 */
export declare class Map {
    static getAdapter(adapterName: string): Promise<typeof MapAdapter>;
}
/**
 * retruns MediaFile-adapter
 */
export declare class Media {
    static getAdapter(adapterName: string): Promise<typeof MediaFileAdapter>;
}
/**
 * retruns Payment-adapter
 */
export declare class Payment {
    static getAdapter(adapterName: string): Promise<PaymentAdapter>;
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
    static getDiscountAdapter(adapterName?: string, initParams?: {
        [key: string]: string | number | boolean;
    }): Promise<DiscountAdapter>;
}
