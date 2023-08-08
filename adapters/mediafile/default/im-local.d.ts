import MediaFileAdapter from "../MediaFileAdapter";
import MediaFileConfig from "../MediaFileConfig";
export default class LocalMediaFileAdapter extends MediaFileAdapter {
    constructor(config: MediaFileConfig);
    load(url: string, key: string): Promise<{
        origin: string;
    }>;
    uploadMediaFile(uploadFile: any, key: string): Promise<any>;
    protected download(url: string, key: string, filename: string): Promise<string>;
    private loadMediaFiles;
}
