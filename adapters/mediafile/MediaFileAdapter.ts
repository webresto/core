import { v5 as uuidv5 } from "uuid";
import MediaFile, { IMediaFile } from "../../models/MediaFile";


export type BaseConfigProperty = BaseConfig | BaseConfig[] | number | boolean | string | null | undefined;

export interface BaseConfig {
  [key: string]: BaseConfigProperty;
}

export type ConfigMediaFileAdapter = BaseConfig;

export type MediaFileTypes = 'image' | 'video' | 'sound' | '3d';

export default abstract class MediaFileAdapter {
  private config: ConfigMediaFileAdapter;
  private initializationPromise: Promise<void>;
  public UUID_NAMESPACE: string;

  constructor(config: ConfigMediaFileAdapter) {
    this.config = config;
    this.initializationPromise = this.initialize();
  }


  /**
   * Async constructor
   */
  private async initialize(){
    this.UUID_NAMESPACE = await Settings.get("UUID_NAMESPACE") as string ?? "9dbceb30-26c3-11ee-be56-0242ac120002"
  }

  /**
   * Waiting for initialization
   */
  public async wait(): Promise<void> {
    await this.initializationPromise;
  }

  public abstract checkFileExist(mediaFile: IMediaFile): Promise<boolean>

  public async toDownload(url: string, target: string, type: MediaFileTypes, force: boolean = false): Promise<MediaFile> {
    await this.wait()
    sails.log.silly(`Adapter > Mediafile > toDownload: ${url}`)
    let imageId = uuidv5(url, this.UUID_NAMESPACE);
    let mediaFile = await MediaFile.findOne({ id: imageId });

    if(!this.checkFileExist(mediaFile)) {
      force = true
    }

    let loadConfig: BaseConfigProperty;
    if (target && this.config && this.config[target]) {
      loadConfig = this.config[target];
    }

    // image
    if (mediaFile === undefined || force) {
      mediaFile = {
        id: imageId
      };
      switch (type) {
        case "image":
          mediaFile.images = await this.process(url, "image", loadConfig);
          break;

        case "video":
          // mediaFile.video = ???
          break;

        case "sound":
          // mediaFile.sound = ???
          break;

        default:
          throw `mediaFile type not known ${type}`
          break;
      }
      mediaFile = await MediaFile.create(mediaFile).fetch()
    }
    return mediaFile;
  };


  public abstract process(url: string, type: MediaFileTypes, config: BaseConfigProperty): Promise<{ origin: string, small: string, large: string }>;
}
