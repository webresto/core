import MediaFileConfig from "./MediaFileConfig";
export default abstract class MediaFileAdapter {
    protected readonly config: MediaFileConfig;
    protected constructor(config: MediaFileConfig);
    abstract load(url: string, key: string): Promise<{
        origin: string;
    }>;
    abstract uploadMediaFile(uploadFile: any, key: string): Promise<any>;
    abstract uploadBase64MediaFile(base64: string, filetype: string, key: string): Promise<any>;
}
