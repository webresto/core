import MediaFileAdapter, { BaseConfig, BaseConfigProperty, ConfigMediaFileAdapter, MediaFileTypes } from "../MediaFileAdapter";
import * as fs from "fs";
import axios from 'axios';
import { v5 as uuidv5 } from "uuid";
import * as path from "path";
//@ts-ignore
import sharp from 'sharp';
import { MediaFileRecord } from "../../../models/MediaFile";

// todo: fix types model instance to {%ModelName%}Record for MediaFile";


export interface MediaFileConfig {
  dish: MediaFileConfigInner;
  group: MediaFileConfigInner;
  adapter: string;
}

export type ImageVariants = {
  origin: string;
  small: string | undefined;
  large: string | undefined;
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

export default class LocalMediaFileAdapter extends MediaFileAdapter {

  /** /////////////////////////////////
   * Process 
   */ /////////////////////////////////

   public async process(url: string, type: MediaFileTypes, config: BaseConfig): Promise<{variant: ImageVariants, originalFilePath: string}> {
    const baseConfig: MediaFileConfigInner = {
      format: "webp",
      resize: {
        small: 512,
        large: 1024
      }
    }

    const cfg = { ...baseConfig, ...config } as unknown as MediaFileConfigInner;

    const isFilePath = url.match(/\.([0-9a-z]+)(?=[?#])|(\.)(?:[\w]+)$/gim);
    let mediafileExtension = '';
    if (isFilePath && isFilePath.length > 0) {
        mediafileExtension = isFilePath[0].replace('.', '');
    }
    
    const origin = this.getNameByUrl(url, cfg.format);

    const name: ImageVariants = {
      origin: origin,
      small: undefined,
      large: undefined
    };

    for (let res in cfg.resize) {
      name[res as keyof ImageVariants] = this.getNameByUrl(url, cfg.format, cfg, res);
    }

    const that = this
    async function processFile(url: string, type: MediaFileTypes) {
      if (url.startsWith('file://')) {
        try {
          const fullPathDl = that.getOriginalFilePath(url, type, true);
          const localFilePath = url.slice(7);
          
          // Check if source file exists
          if (!fs.existsSync(localFilePath)) {
            sails.log.error(`Source file does not exist: ${localFilePath}`);
            return;
          }
          
          sails.log.silly(`MF local > copy file: ${localFilePath} to ${fullPathDl}`);
          const prefix = that.getPrefix(type, false);
    
          // Await each async operation to ensure completion before moving to the next step
          await fs.promises.mkdir(prefix, { recursive: true });
          await fs.promises.copyFile(localFilePath, fullPathDl);
          await fs.promises.unlink(localFilePath);
    
          sails.log.debug(`File copied and original deleted successfully. ${url}, ${fullPathDl}`);
        } catch (error) {
          sails.log.error(`Failed to process file: ${error.message}`);
          sails.log.error(error)
        }
      }
    }
    
    // Somewhere in your main function or code where you need to call processFile:
    await processFile(url, type);

    this.loadMediaFilesProcessQueue.push({
      url: url,
      type: type,
      name: name,
      config: cfg
    });

    let result = {} as typeof name;
    for (const key in name) {
      if (typeof name[key as keyof ImageVariants] === "string") {
        result[key as keyof ImageVariants] = "/" + type + "/" + name[key as keyof ImageVariants];
      }
    }

    return {
      variant: result,
      originalFilePath: this.getOriginalFilePath(url, type, false, cfg.format)
    };
  }

  public async checkFileExist(mediaFile: MediaFileRecord): Promise<boolean> {
    let allFileExist: boolean = true;
  
    if (mediaFile && /* mediaFile.type === "image" && **/ typeof mediaFile.images === "object" && mediaFile.images !== null && Object.keys(mediaFile.images).length) {
      const images = mediaFile.images;
      
      for (const key in images) {
        const imageFilePath = path.join(this.getPrefix(), images[key]);
        try {
          await fs.promises.access(imageFilePath, fs.constants.F_OK);
        } catch (error) {
          // If the file does not exist, set the allFileExist flag to false
          sails.log.debug(`LocalMediaFileAdapter > file not exist: ${imageFilePath}`)
          allFileExist = false;
        }
      }
    }
  
    return allFileExist;
  }
  
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
      //baseName += `-${Math.floor(Date.now() / 1000)}`
    }

    // Default to 'jpg' if extension is empty or undefined
    const fileExt = ext || 'jpg';
    baseName += `.${fileExt}`;
    return baseName;
  }

  protected getPrefix(type?: MediaFileTypes, absolute: boolean = true) {
    const basePath = type ? path.join(".tmp/public", type) : path.join(".tmp/public");
    
    return absolute ? path.resolve(basePath) : basePath;
  }

  getOriginalFilePath(url: string, type: MediaFileTypes, absolute: boolean = false, ext?: string){
    const prefix = this.getPrefix(type, absolute);
    const fileExt = ext || 'webp'; // Default to webp for images
    const originalFilePath = path.join(prefix, this.getNameByUrl(url, fileExt));
    return originalFilePath;
  }

  protected async download(loadMediaFilesProcess: LoadMediaFilesProcess): Promise<string> {
    const prefix = this.getPrefix(loadMediaFilesProcess.type);
    const isFilePath = loadMediaFilesProcess.url.match(/\.([0-9a-z]+)(?=[?#])|(\.)(?:[\w]+)$/gim);
    let mediafileExtension = '';
    if (isFilePath && isFilePath.length > 0) {
        mediafileExtension = isFilePath[0].replace('.', '');
    }
    const fullPathDl = this.getOriginalFilePath(loadMediaFilesProcess.url, loadMediaFilesProcess.type, true, mediafileExtension || 'webp');
  
    // Check if file exists
    if (!fs.existsSync(fullPathDl)) {
      let response;
      const url = loadMediaFilesProcess.url;
  
      if (url.startsWith('http://') || url.startsWith('https://')) {
        // Handle HTTP/HTTPS URL
        response = await axios.get(url, { responseType: 'stream', maxRedirects: 5 });
        sails.log.silly(`MF local > download image: ${fullPathDl}, status: ${response.status}`);
  
        fs.mkdirSync(prefix, { recursive: true });
  
        const writer = fs.createWriteStream(fullPathDl);
        response.data.pipe(writer);
  
        await new Promise((resolve, reject) => {
          writer.on('finish', resolve);
          writer.on('error', reject);
        });
      } else {
        sails.log.error(`Unsupported URL protocol: ${url}`);
      }
    } else {
      sails.log.silly(`File ${fullPathDl} already exists. Skipping download.`);
    }
    return fullPathDl
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

    try {
  
      this.processing = true
      let MEDIAFILE_PARALLEL_TO_DOWNLOAD = await Settings.get('MEDIAFILE_PARALLEL_TO_DOWNLOAD') ?? 3;
      if (MEDIAFILE_PARALLEL_TO_DOWNLOAD > this.loadMediaFilesProcessQueue.length) MEDIAFILE_PARALLEL_TO_DOWNLOAD = this.loadMediaFilesProcessQueue.length;
  
      while (this.loadMediaFilesProcessQueue.length) {
  
        const loadMediaFilesProcesses = this.loadMediaFilesProcessQueue.splice(0, MEDIAFILE_PARALLEL_TO_DOWNLOAD);
        const downloadPromises = loadMediaFilesProcesses.map(async (loadMediaFilesProcess) => {
          try {
            
            const fullPathDl = await this.download(loadMediaFilesProcess);
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
                      srcPath: fullPathDl,
                      dstPath: path.join(prefix, loadMediaFilesProcess.name[size]),
                      size: mediafileItem
                    });
                    sails.log.silly(`MF local > process finished: ${loadMediaFilesProcess.name[size]}`);
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
    } catch (error) {
      sails.log.error("loadMediaFiles error:",error)
    }
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
    sails.log.error(`MF local error > resizeMediaFile:`, srcPath, dstPath, size);
    sails.log.error(error)
    throw new Error(error);
  }
}
