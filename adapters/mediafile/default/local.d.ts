import MediaFileAdapter, { BaseConfig, MediaFileTypes } from "../MediaFileAdapter";
import { MediaFileRecord } from "../../../models/MediaFile";
export interface MediaFileConfig {
    dish: MediaFileConfigInner;
    group: MediaFileConfigInner;
    adapter: string;
}
export type ImageVariants = {
    origin: string;
    small: string | undefined;
    large: string | undefined;
};
interface MediaFileConfigInner {
    format: string;
    resize: {
        small: number;
        large: number;
        [x: string]: number;
    };
}
interface LoadMediaFilesProcess {
    url: string;
    type: MediaFileTypes;
    name: {
        [x: string]: string;
    };
    config: MediaFileConfigInner;
}
export default class LocalMediaFileAdapter extends MediaFileAdapter {
    checkFileExist(mediaFile: MediaFileRecord): Promise<boolean>;
    private processing;
    private processingTimeout;
    loadMediaFilesProcessQueue: LoadMediaFilesProcess[];
    constructor(config: BaseConfig);
    getNameByUrl(url: string, ext: string, options?: any, salt?: string): string;
    process(url: string, type: MediaFileTypes, config: BaseConfig): Promise<{
        variant: ImageVariants;
        originalFilePath: string;
    }>;
    protected getPrefix(type?: MediaFileTypes): string;
    getOriginalFilePath(url: string, type: MediaFileTypes): string;
    protected download(loadMediaFilesProcess: LoadMediaFilesProcess): Promise<string>;
    private loadMediaFiles;
}
export {};
