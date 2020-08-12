import RMSAdapter from './rms/RMSAdapter';
import MapAdapter from './map/MapAdapter';
import ImageAdapter from "./image/ImageAdapter";
import PaymentAdapter from './payment/PaymentAdapter';
export declare class RMS {
    static getAdapter(adapterName: string): typeof RMSAdapter;
}
export declare class Map {
    static getAdapter(adapterName: string): new (config: any) => MapAdapter;
}
export declare class ImageA {
    static getAdapter(adapterName: string): ImageAdapter;
}
export declare class Payment {
    static getAdapter(adapterName: string): PaymentAdapter;
}
