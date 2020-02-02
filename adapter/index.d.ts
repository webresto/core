import RMSAdapter from '@webresto/core/adapter/rms/RMSAdapter';
import MapAdapter from '@webresto/core/adapter/map/MapAdapter';
import ImageAdapter from "@webresto/core/adapter/image/ImageAdapter";
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
