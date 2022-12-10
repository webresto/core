import MediaFileConfig from "./MediaFileConfig";

export default abstract class MediaFileAdapter {
  protected readonly config: MediaFileConfig;

  protected constructor(config: MediaFileConfig) {
    config.dish.path = config.dish.path || "";
    config.group.path = config.group.path || "";
    config.dish.format = config.dish.format || "png";
    config.group.format = config.group.format || "png";
    this.config = config;
  }

  public abstract load(url: string, key: string): Promise<{ origin: string }>;
  public abstract uploadMediaFile(uploadFile: any, key: string): Promise<any>;
  public abstract uploadBase64MediaFile(base64: string, filetype: string, key: string): Promise<any>;
}
