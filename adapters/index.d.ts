import RMSAdapter from "./rms/RMSAdapter";
import MapAdapter from "./map/MapAdapter";
import MediaFileAdapter from "./mediafile/MediaFileAdapter";
import PaymentAdapter from "./payment/PaymentAdapter";
/**
 * Отдаёт запрашиваемый RMS-адаптер
 */
export declare class RMS {
    static getAdapter(adapterName: string): typeof RMSAdapter;
}
/**
 * Отдаёт запрашиваемый Map-адаптер
 */
export declare class Map {
    static getAdapter(adapterName: string): new (config: any) => MapAdapter;
}
/**
 * Отдаёт запрашиваемый MediaFile-адаптер
 */
export declare class MediaFileA {
    static getAdapter(adapterName: string): MediaFileAdapter;
}
/**
 * Отдаёт запрашиваемый Payment-адаптер
 */
export declare class Payment {
    static getAdapter(adapterName: string): PaymentAdapter;
}
