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

  public async abstract load(url: string, key: string): Promise<{ origin: string }>;
}
