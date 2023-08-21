import MediaFile from "../../models/MediaFile";
export type BaseConfigProperty = BaseConfig | BaseConfig[] | number | boolean | string | null | undefined;
export interface BaseConfig {
    [key: string]: BaseConfigProperty;
}
export type ConfigMediaFileAdapter = BaseConfig;
export type MediaFileTypes = 'image' | 'video' | 'sound' | '3d';
export default abstract class MediaFileAdapter {
    private config;
    private initializationPromise;
    UUID_NAMESPACE: string;
    constructor(config: ConfigMediaFileAdapter);
    /**
     * Async constructor
     */
    private initialize;
    /**
     * Waiting for initialization
     */
    wait(): Promise<void>;
    toDownload(url: string, target: string, type: MediaFileTypes, force?: boolean): Promise<MediaFile>;
    abstract process(url: string, type: MediaFileTypes, config: BaseConfigProperty): Promise<{
        origin: string;
        small: string;
        large: string;
    }>;
}
