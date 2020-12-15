import ImageConfig from "./ImageConfig";

export default abstract class ImageAdapter {
  protected readonly config: ImageConfig;

  protected constructor(config: ImageConfig) {
    config.dish.path = config.dish.path || "";
    config.group.path = config.group.path || "";
    config.dish.format = config.dish.format || "png";
    config.group.format = config.group.format || "png";
    this.config = config;
  }

  public abstract load(url: string, key: string): Promise<{ origin: string }>;
  public abstract uploadImage(uploadFile: any, key: string): Promise<any>;
  public abstract uploadBase64Image(base64: string, filetype: string, key: string ): Promise<any>;
}