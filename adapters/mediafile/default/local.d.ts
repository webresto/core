import MediaFileAdapter, { BaseConfig, MediaFileTypes } from "../MediaFileAdapter";
export interface MediaFileConfig {
    dish: MediaFileConfigInner;
    group: MediaFileConfigInner;
    adapter: string;
}
interface MediaFileConfigInner {
    format: string;
    background: string;
    resize: {
        small: Size;
        large: Size;
        [x: string]: Size;
    };
}
interface Size {
    width?: number;
    height?: number;
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
    loadMediaFilesProcessQueue: LoadMediaFilesProcess[];
    constructor(config: BaseConfig);
    getNameByUrl(url: string, ext: string, options?: any, salt?: boolean): string;
    load(url: string, type: MediaFileTypes, config: BaseConfig): Promise<{
        origin: string;
        small: string;
        large: string;
    }>;
    protected download(loadMediaFilesProcess: LoadMediaFilesProcess): Promise<void>;
    private loadMediaFiles;
}
export {};
