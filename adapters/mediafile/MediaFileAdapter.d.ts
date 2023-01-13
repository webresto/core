import MediaFileConfig from "./MediaFileConfig";
export default abstract class MediaFileAdapter {
    protected readonly config: MediaFileConfig;
    protected constructor(config: MediaFileConfig);
    abstract load(url: string, key: string): Promise<{
        origin: string;
    }>;
    abstract uploadMediaFile(uploadFile: any, key: string): Promise<any>;
}
