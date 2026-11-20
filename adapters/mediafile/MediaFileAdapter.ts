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

  /**
   * @param options.wait return only when the files are on disk; throw if they could not be
   *   downloaded or processed, and then write no paths to the record.
   *   Without it the files are processed in the background (menu sync).
   */
  public async toProcess(url: string, target: string, type: MediaFileTypes, force: boolean = false, options: { wait?: boolean } = {}): Promise<MediaFileRecord> {
    await this.wait()
    sails.log.silly(`Adapter > Mediafile > toProcess: ${url}`)
    let imageId = uuidv5(url, this.UUID_NAMESPACE);
    let mediaFile = await MediaFile.findOne({ id: imageId });

    let toDownload = force;
    let created = false;

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
      try {
        mediaFile = await MediaFile.create(mediaFile).fetch()
        created = true;
      } catch (error) {
        // the same url asked for at the same time: the other call has created the record
        const existing = await MediaFile.findOne({ id: imageId });
        if (!existing) throw error;
        mediaFile = existing;
      }
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
          let process: Awaited<ReturnType<MediaFileAdapter["process"]>>;
          try {
            process = await this.process(url, "image", loadConfig, options.wait === true);
          } catch (error) {
            // a record that has never had a file is not left behind
            if (created) await MediaFile.destroy({ id: imageId });
            throw error;
          }
          mediaFile.variant = process.variant
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
       * Without options.wait the paths are written before the files exist; checkFileExist
       * sends such a record to download again on the next toProcess.
       */
      mediaFile = (await MediaFile.update({ id: imageId }, { variant: mediaFile.variant, original: url, originalFilePath, type }).fetch())[0]
    }
    return mediaFile;
  };


  public abstract process(url: string, type: MediaFileTypes, config: BaseConfigProperty, wait?: boolean): Promise<{variant: { origin: string, small: string, large: string }, originalFilePath: string}>;
}
