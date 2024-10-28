import { v5 as uuidv5 } from "uuid";
import { MediaFileRecord } from "../../models/MediaFile";
// todo: fix types model instance to {%ModelName%}Record for MediaFile";


export type BaseConfigProperty = BaseConfig | BaseConfig[] | number | boolean | string | null | undefined;

export interface BaseConfig {
  [key: string]: BaseConfigProperty;
}

export type ConfigMediaFileAdapter = BaseConfig;

export type MediaFileTypes = 'image' | 'video' | 'audio';

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
  private async initialize() {
    this.UUID_NAMESPACE = await Settings.get("UUID_NAMESPACE") ?? "9dbceb30-26c3-11ee-be56-0242ac120002"
  }

  /**
   * Waiting for initialization
   */
  public async wait(): Promise<void> {
    await this.initializationPromise;
  }

  public abstract checkFileExist(mediaFile: MediaFileRecord): Promise<boolean>

  public async toProcess(url: string, target: string, type: MediaFileTypes, force: boolean = false): Promise<MediaFileRecord> {
    await this.wait()
    sails.log.silly(`Adapter > Mediafile > toProcess: ${url}`)
    let imageId = uuidv5(url, this.UUID_NAMESPACE);
    let mediaFile = await MediaFile.findOne({ id: imageId });

    let toDownload = force;

    // Todo: delete it in v3
    if (mediaFile !== undefined && !mediaFile.type) {
      mediaFile.type = type;
    }


    if (mediaFile) {
      if (await this.checkFileExist(mediaFile) === false) {
        toDownload = true;
      }
    } else {
      mediaFile = {
        id: imageId
      };
      mediaFile = await MediaFile.create(mediaFile).fetch()
      toDownload = true;
    }

    if (toDownload) {
      let loadConfig: BaseConfigProperty;
      if (target && this.config && this.config[target]) {
        loadConfig = this.config[target];
      }
      let originalFilePath = ""
      switch (type) {
        case "image":
          const process =  await this.process(url, "image", loadConfig);
          mediaFile.images = process.variant
          originalFilePath = process.originalFilePath;
          break;

        case "video":
          // mediaFile.video = ???
          break;

        case "audio":
          // mediaFile.audio = ???
          break;

        default:
          throw `mediaFile type not known ${type}`
          break;
      }
      /**
       * The problem remains that we cannot know whether the picture has loaded or not, and therefore. if it doesn't exist you need to somehow remove MF
       */
      mediaFile = (await MediaFile.update({ id: mediaFile.id }, { images: mediaFile.images, original: url, originalFilePath, type }).fetch())[0]
    }
    return mediaFile;
  };


  public abstract process(url: string, type: MediaFileTypes, config: BaseConfigProperty): Promise<{variant: { origin: string, small: string, large: string }, originalFilePath: string}>;
}
