import ImageConfig from "./ImageConfig";
export default abstract class ImageAdapter {
    protected readonly config: ImageConfig;
    protected constructor(config: ImageConfig);
    abstract load(url: string, key: string): Promise<{
        origin: string;
    }>;
    abstract uploadImage(uploadFile: any, key: string): Promise<any>;
    abstract uploadBase64Image(base64: string, filetype: string, key: string): Promise<any>;
}
