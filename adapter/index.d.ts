import RMSAdapter from './rms/RMSAdapter';
import MapAdapter from './map/MapAdapter';
import ImageAdapter from "./image/ImageAdapter";
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
 * Отдаёт запрашиваемый Image-адаптер
 */
export declare class ImageA {
    static getAdapter(adapterName: string): ImageAdapter;
}
