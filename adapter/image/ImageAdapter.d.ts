import ImageConfig from "./ImageConfig";
export default abstract class ImageAdapter {
    protected readonly config: ImageConfig;
    protected constructor(config: ImageConfig);
    abstract load(url: string, key: 'dish' | 'group'): Promise<{
        origin: string;
    }>;
}
