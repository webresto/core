import { MediaFileRecord } from "../../models/MediaFile";
export type BaseConfigProperty = BaseConfig | BaseConfig[] | number | boolean | string | null | undefined;
export interface BaseConfig {
    [key: string]: BaseConfigProperty;
}
export type ConfigMediaFileAdapter = BaseConfig;
export type MediaFileTypes = 'image' | 'video' | 'audio';
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
    abstract checkFileExist(mediaFile: MediaFileRecord): Promise<boolean>;
    toProcess(url: string, target: string, type: MediaFileTypes, force?: boolean): Promise<MediaFileRecord>;
    abstract process(url: string, type: MediaFileTypes, config: BaseConfigProperty): Promise<{
        variant: {
            origin: string;
            small: string;
            large: string;
        };
        originalFilePath: string;
    }>;
}
