import MediaFileAdapter, { BaseConfig, BaseConfigProperty, ConfigMediaFileAdapter, MediaFileTypes } from "../MediaFileAdapter";
import * as fs from "fs";
import axios from 'axios';
import { v5 as uuidv5 } from "uuid";
import * as path from "path";
//@ts-ignore
import sharp from 'sharp';


export interface MediaFileConfig {
  dish: MediaFileConfigInner;
  group: MediaFileConfigInner;
  adapter: string;
}

interface MediaFileConfigInner {
  format: string;
  resize: {
    small: number
    large: number
    [x: string]: number
  };
}


interface LoadMediaFilesProcess {
  url: string;
  type: MediaFileTypes;
  name: {
    [x: string]: string
  };
  config: MediaFileConfigInner;
}



// images: {
//   adapter: 'imagemagick-local',
//   dish: {
//     format: process.env.IMAGES_DISH_FILE_FORMAT === undefined ? 'png' : process.env.IMAGES_DISH_FILE_FORMAT,
//     path: '/images',
//     resize: {
//       small: {
//         width: process.env.IMAGES_SMALL_SIZE_PX === undefined ? 600 : parseInt(process.env.IMAGES_SMALL_SIZE_PX),
//         height: process.env.IMAGES_SMALL_SIZE_PX === undefined ? 600 : parseInt(process.env.IMAGES_SMALL_SIZE_PX)
//       },
//       large: {
//         width: process.env.IMAGES_LARGE_SIZE_PX === undefined ? 900 : parseInt(process.env.IMAGES_LARGE_SIZE_PX),
//       }
//     }
//   },
//   group: {
//     format: process.env.IMAGES_GROUP_FILE_FORMAT === undefined ? 'png' : process.env.IMAGES_GROUP_FILE_FORMAT,
//     path: '/imagesG',
//   }
// },

export default class LocalMediaFileAdapter extends MediaFileAdapter {
  private processing: boolean = false;


  private processingTimeout: ReturnType<typeof setTimeout> // TODO: rewrite by proxy

  public loadMediaFilesProcessQueue: LoadMediaFilesProcess[] = [];
  constructor(config: BaseConfig) {
    super(config);
    this.loadMediaFiles()
  }

  public getNameByUrl(url: string, ext: string, options?: any, salt: string = null): string {
    let baseName = url;
    if (options) baseName += JSON.stringify(options);
    baseName = uuidv5(baseName, this.UUID_NAMESPACE);

    if (salt) {
      baseName += `-${salt.toString().toLowerCase().replace(/[^a-zA-Z]+/g, "").substring(0, 7)}`
      baseName += `-${Math.floor(Date.now() / 1000)}`
    }

    baseName += `.${ext}`;
    return baseName;
  }

  public async process(url: string, type: MediaFileTypes, config: BaseConfig): Promise<{ origin: string, small: string, large: string }> {
    const baseConfig: MediaFileConfigInner = {
      format: "webp",
      resize: {
        small: 512,
        large: 1024
      }
    }

    const cfg = { ...baseConfig, ...config } as unknown as MediaFileConfigInner;

    const mediafileExtension = url.match(/\.([0-9a-z]+)(?=[?#])|(\.)(?:[\w]+)$/gim)[0].replace('.', '');
    const origin = this.getNameByUrl(url, mediafileExtension);

    const name = {
      origin: origin,
      small: undefined,
      large: undefined
    };

    for (let res in cfg.resize) {
      name[res] = this.getNameByUrl(url, cfg.format, cfg, res);
    }

    this.loadMediaFilesProcessQueue.push({
      url: url,
      type: type,
      name: name,
      config: cfg
    });

    let result = {} as typeof name;
    for (const key in name) {
      if (typeof name[key] === "string") {
        result[key] = "/" + type + "/" + name[key];
      }
    }
    return result;
  }

  protected getPrefix(type: string) {
    return path.join(process.cwd(), ".tmp/public", type);
  }

  protected async download(loadMediaFilesProcess: LoadMediaFilesProcess): Promise<void> {
    const prefix = this.getPrefix(loadMediaFilesProcess.type);
    const fullPathDl = path.join(prefix, loadMediaFilesProcess.name.origin);

    // Check if file exists
    if (!fs.existsSync(fullPathDl)) {
      const response = await axios.get(loadMediaFilesProcess.url, { responseType: 'stream' });
      sails.log.debug(`MF local > download image: ${fullPathDl}, status: ${response.status}`);

      fs.mkdirSync(prefix, { recursive: true });

      const writer = fs.createWriteStream(fullPathDl);
      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });
    } else {
      sails.log.silly(`File ${fullPathDl} already exists. Skipping download.`);
    }
  }


  private async loadMediaFiles() {
    if (this.processing) {
      return
    }

    if (this.loadMediaFilesProcessQueue.length === 0) {
      sails.log.silly(`MF local > no mediafiles to download`)
      this.processingTimeout = setTimeout(this.loadMediaFiles.bind(this), 30000);
      return;
    }

    this.processing = true
    let MEDIAFILE_PARALLEL_TO_DOWNLOAD = await Settings.get('MEDIAFILE_PARALLEL_TO_DOWNLOAD') ?? 3;
    if (MEDIAFILE_PARALLEL_TO_DOWNLOAD > this.loadMediaFilesProcessQueue.length) MEDIAFILE_PARALLEL_TO_DOWNLOAD = this.loadMediaFilesProcessQueue.length;

    while (this.loadMediaFilesProcessQueue.length) {

      const loadMediaFilesProcesses = this.loadMediaFilesProcessQueue.splice(0, MEDIAFILE_PARALLEL_TO_DOWNLOAD);
      const downloadPromises = loadMediaFilesProcesses.map(async (loadMediaFilesProcess) => {
        try {
          await this.download(loadMediaFilesProcess);
          const prefix = this.getPrefix(loadMediaFilesProcess.type);
          switch (loadMediaFilesProcess.type) {
            case "image":
              sails.log.debug(`MF local > process image: ${loadMediaFilesProcess.name.origin}`);
              for (let size in loadMediaFilesProcess.config.resize) {
                const dstPath = path.join(prefix, loadMediaFilesProcess.name[size]);
                if (!fs.existsSync(dstPath)) {
                  if (size === "origin")
                    continue;
                  let mediafileItem = loadMediaFilesProcess.config.resize[size];
                  if (!mediafileItem) {
                    mediafileItem = 240;
                    sails.log.warn(`MediaFile size is not set for ${size}`);
                  }


                  await resizeMediaFile({
                    srcPath: path.join(prefix, loadMediaFilesProcess.name.origin),
                    dstPath: path.join(prefix, loadMediaFilesProcess.name[size]),
                    size: mediafileItem
                  });
                  sails.log.debug(`MF local > process finished: ${loadMediaFilesProcess.name[size]}`);
                } else {
                  sails.log.debug(`MF local > process skip existing processed file: ${loadMediaFilesProcess.name[size]}`);
                }
              }
              break;
            default:
              break;
          }
        } catch (error) {
          // Log the error and rethrow it
          sails.log.error(`MF local Error > processing file ${loadMediaFilesProcess.name.origin}: ${error}`);
        }
      });

      try {
        // Wait for all downloads and processing to complete
        await Promise.all(downloadPromises);
      } catch (error) {
        // Handle errors that occurred during processing
        sails.log.error(`MF local Error > file processing: ${error}`);
      }
    }
    this.processing = false
    this.processingTimeout = setTimeout(this.loadMediaFiles.bind(this), 30000);
  }
}

interface ResizeMediaFileOptions {
  srcPath: string;
  dstPath: string;
  size: number;
}

async function resizeMediaFile({ srcPath, dstPath, size  }: ResizeMediaFileOptions): Promise<void> {
  try {
    const { width, height } = await sharp(srcPath).metadata();

    // Determine which side is smaller
    let resizeWidth, resizeHeight;
    if (width > height) {
      resizeWidth = Math.round(size * (width / height));
      resizeHeight = size;
    } else {
      resizeWidth = size;
      resizeHeight = Math.round(size * (height / width));
    }

    // If no background color or no alpha channel, simply resize the image
    await sharp(srcPath)
      .resize(resizeWidth, resizeHeight)
      .toFile(dstPath);
  } catch (error) {
    console.error(`MF local error > resizeMediaFile:`, srcPath, dstPath, size);
    console.error(error)
    throw new Error(error);
  }
}
