import { v5 as uuidv5} from "uuid";
import MediaFile from "../../models/MediaFile";


export type BaseConfigProperty =  BaseConfig | BaseConfig[] | number | boolean | string | null | undefined;

export interface BaseConfig {
  [key: string]: BaseConfigProperty;
};

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

  public async toDownload(url: string, target: string, type: MediaFileTypes, force: boolean = false): Promise<MediaFile> {
    await this.wait()
    let imageId = uuidv5(url, this.UUID_NAMESPACE);
    const mediaFile = await MediaFile.findOne({ id: imageId });
    
    let loadConfig: BaseConfigProperty;
    if (target && this.config[target]){
      loadConfig = this.config[target];
    }
    
    
    // image     
    if (mediaFile === undefined || force) {
      switch (type)
      {
        case "image":
          mediaFile.images = this.load(url, "image", loadConfig);
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

      // DOWNLOAD
    }

    return mediaFile;
  };


  public abstract load(url: string, type: MediaFileTypes, config: BaseConfigProperty): Promise<{ origin: string, small: string, large: string }>;
}
