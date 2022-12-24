import RMSAdapter from "./rms/RMSAdapter";
import MapAdapter from "./map/MapAdapter";
import CaptchaAdapter from "./captcha/CaptchaAdapter";
import MediaFileAdapter from "./mediafile/MediaFileAdapter";
import PaymentAdapter from "./payment/PaymentAdapter";
/**
 * retruns RMS-adapter
 */
export declare class RMS {
    static getAdapter(adapterName: string): typeof RMSAdapter;
}
/**
 * retruns Map-adapter
 */
export declare class Map {
    static getAdapter(adapterName: string): new (config: any) => MapAdapter;
}
/**
 * retruns MediaFile-adapter
 */
export declare class MediaFileA {
    static getAdapter(adapterName: string): MediaFileAdapter;
}
/**
 * retruns Payment-adapter
 */
export declare class Payment {
    static getAdapter(adapterName: string): PaymentAdapter;
}
/**
 * retruns Captcha-adapter
 */
export declare class Captcha {
    static getAdapter(adapterName?: string): CaptchaAdapter;
}
