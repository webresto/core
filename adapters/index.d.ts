import RMSAdapter from "./rms/RMSAdapter";
import MapAdapter from "./map/MapAdapter";
import CaptchaAdapter from "./captcha/CaptchaAdapter";
import OTPAdapter from "./otp/OneTimePasswordAdapter";
import NotificationAdapter from "./notification/NotificationAdapter";
import MediaFileAdapter from "./mediafile/MediaFileAdapter";
import PaymentAdapter from "./payment/PaymentAdapter";
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
export declare class MediaFile {
    static getAdapter(adapterName: string): Promise<MediaFileAdapter>;
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
/**
 * retruns Notification-adapter
 */
export declare class Notification {
    static getAdapter(adapterName?: string): Promise<NotificationAdapter>;
}
