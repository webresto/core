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
    private processing;
    private processingTimeout;
    loadMediaFilesProcessQueue: LoadMediaFilesProcess[];
    constructor(config: BaseConfig);
    getNameByUrl(url: string, ext: string, options?: any, salt?: boolean, short?: boolean): string;
    process(url: string, type: MediaFileTypes, config: BaseConfig): Promise<{
        origin: string;
        small: string;
        large: string;
    }>;
    protected getPrefix(type: string): string;
    protected download(loadMediaFilesProcess: LoadMediaFilesProcess): Promise<void>;
    private loadMediaFiles;
}
export {};
