import MediaFileAdapter, { BaseConfig, BaseConfigProperty, ConfigMediaFileAdapter, MediaFileTypes } from "../MediaFileAdapter";
import * as fs from "fs";
import { pipeline } from "stream/promises";
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
  resolve: () => void;
  reject: (error: Error) => void;
}

/** Unique suffix for a temporary file next to its target; the target appears only by rename, whole. */
function partPath(target: string): string {
  return `${target}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}.part`;
}

export default class LocalMediaFileAdapter extends MediaFileAdapter {

  /** /////////////////////////////////
   * Process
   */ /////////////////////////////////

  /**
   * Puts the file to the queue and returns the paths it will have.
   * With `wait` it returns only when the original and every variant are on disk,
   * and throws when the file could not be downloaded or processed.
   */
  public async process(url: string, type: MediaFileTypes, config: BaseConfig, wait: boolean = false): Promise<{variant: ImageVariants, originalFilePath: string}> {
    const baseConfig: MediaFileConfigInner = {
      format: "webp",
      resize: {
        small: 512,
        large: 1024
      }
    }

    const cfg = { ...baseConfig, ...config } as unknown as MediaFileConfigInner;

    const origin = this.getNameByUrl(url, cfg.format);

    const name: ImageVariants = {
      origin: origin,
      small: undefined,
      large: undefined
    };

    for (let res in cfg.resize) {
      name[res as keyof ImageVariants] = this.getNameByUrl(url, cfg.format, cfg, res);
    }

    if (url.startsWith('file://')) {
      await this.copyLocalFile(url, type);
    }

    // One url is processed once at a time: a second call joins the first instead of
    // writing the same files concurrently.
    const key = `${type}/${origin}`;
    let done = this.inflight.get(key);
    if (!done) {
      done = new Promise<void>((resolve, reject) => {
        this.loadMediaFilesProcessQueue.push({ url, type, name, config: cfg, resolve, reject });
      });
      this.inflight.set(key, done);
      const forget = () => { this.inflight.delete(key); };
      done.then(forget, forget);
      this.kickoffProcessing();
    }

    if (wait) {
      await done;
    } else {
      done.catch(() => { /* logged by loadMediaFiles */ });
    }

    let result = {} as typeof name;
    for (const key in name) {
      if (typeof name[key as keyof ImageVariants] === "string") {
        result[key as keyof ImageVariants] = "/" + type + "/" + name[key as keyof ImageVariants];
      }
    }

    return {
      variant: result,
      originalFilePath: this.getDownloadPath(url, type, false)
    };
  }

  /** file:// — the uploaded file is copied right away; the upload itself is deleted after processing. */
  private async copyLocalFile(url: string, type: MediaFileTypes): Promise<void> {
    const fullPathDl = this.getDownloadPath(url, type, true);
    const localFilePath = url.slice(7);
    try {
      if (!fs.existsSync(localFilePath)) {
        sails.log.error(`Source file does not exist: ${localFilePath}`);
        return;
      }
      sails.log.silly(`MF local > copy file: ${localFilePath} to ${fullPathDl}`);
      await fs.promises.mkdir(this.getPrefix(type), { recursive: true });
      const tmp = partPath(fullPathDl);
      await fs.promises.copyFile(localFilePath, tmp);
      await fs.promises.rename(tmp, fullPathDl);
      sails.log.debug(`File copied successfully. ${url}, ${fullPathDl}`);
    } catch (error) {
      sails.log.error(`Failed to process file: ${error.message}`);
      sails.log.error(error)
    }
  }

  public async checkFileExist(mediaFile: MediaFileRecord): Promise<boolean> {
    let allFileExist: boolean = true;

    if (mediaFile && /* mediaFile.type === "image" && **/ typeof mediaFile.variant === "object" && mediaFile.variant !== null && Object.keys(mediaFile.variant).length) {
      const images = mediaFile.variant;

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

  /** Files in the queue or being processed, by `${type}/${origin name}`. */
  private inflight = new Map<string, Promise<void>>();

  public loadMediaFilesProcessQueue: LoadMediaFilesProcess[] = [];
  constructor(config: BaseConfig) {
    super(config);
    this.loadMediaFiles()
  }

  private kickoffProcessing() {
    if (this.processing) {
      return;
    }
    if (this.processingTimeout) {
      clearTimeout(this.processingTimeout);
    }
    // Process newly enqueued images immediately to reduce race windows on restart.
    void this.loadMediaFiles();
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

  /**
   * Where the source file lies as it was received: a url keeps its own extension,
   * a file:// upload is copied under .webp (as before).
   */
  protected getDownloadPath(url: string, type: MediaFileTypes, absolute: boolean): string {
    if (url.startsWith('file://')) {
      return this.getOriginalFilePath(url, type, absolute, 'webp');
    }
    const isFilePath = url.match(/\.([0-9a-z]+)(?=[?#])|(\.)(?:[\w]+)$/gim);
    let mediafileExtension = '';
    if (isFilePath && isFilePath.length > 0) {
      mediafileExtension = isFilePath[0].replace('.', '');
    }
    return this.getOriginalFilePath(url, type, absolute, mediafileExtension || 'webp');
  }

  /**
   * Returns the path of the source file and whether it was downloaded just now.
   * A download is written to a temporary file and renamed only when complete,
   * so a file on disk under the final name is always whole.
   */
  protected async download(loadMediaFilesProcess: LoadMediaFilesProcess): Promise<{ path: string, fresh: boolean }> {
    const prefix = this.getPrefix(loadMediaFilesProcess.type);
    const url = loadMediaFilesProcess.url;
    const fullPathDl = this.getDownloadPath(url, loadMediaFilesProcess.type, true);

    // file:// — already copied by copyLocalFile()
    if (url.startsWith('file://')) {
      sails.log.silly(`MF local > file:// already copied: ${fullPathDl}`);
      return { path: fullPathDl, fresh: true };
    }

    if (fs.existsSync(fullPathDl)) {
      sails.log.silly(`File ${fullPathDl} already exists. Skipping download.`);
      return { path: fullPathDl, fresh: false };
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      throw new Error(`Unsupported URL protocol: ${url}`);
    }

    const response = await axios.get(url, {
      responseType: 'stream',
      maxRedirects: 5,
      timeout: 60000,
      // the body as it is, so that its length can be checked against content-length
      decompress: false,
      headers: { 'Accept-Encoding': 'identity' },
    });
    sails.log.silly(`MF local > download image: ${fullPathDl}, status: ${response.status}`);

    await fs.promises.mkdir(prefix, { recursive: true });

    const tmp = partPath(fullPathDl);
    let received = 0;
    response.data.on('data', (chunk: Buffer) => { received += chunk.length; });
    try {
      await pipeline(response.data, fs.createWriteStream(tmp));
      const expected = Number(response.headers['content-length']);
      if (!response.headers['content-encoding'] && Number.isFinite(expected) && expected > 0 && received !== expected) {
        throw new Error(`Incomplete download of ${url}: ${received} of ${expected} bytes`);
      }
      await fs.promises.rename(tmp, fullPathDl);
    } catch (error) {
      await fs.promises.unlink(tmp).catch(() => {});
      throw error;
    }
    return { path: fullPathDl, fresh: true };
  }

  /** The original in the configured format and every resized variant, each written whole. */
  private async processImage(loadMediaFilesProcess: LoadMediaFilesProcess, srcPath: string): Promise<void> {
    const prefix = this.getPrefix(loadMediaFilesProcess.type);
    sails.log.debug(`MF local > process image: ${loadMediaFilesProcess.name.origin}`);

    const originPath = path.join(prefix, loadMediaFilesProcess.name.origin);
    if (originPath !== srcPath && !fs.existsSync(originPath)) {
      await convertMediaFile({ srcPath, dstPath: originPath });
    }

    for (let size in loadMediaFilesProcess.config.resize) {
      if (size === "origin")
        continue;
      const dstPath = path.join(prefix, loadMediaFilesProcess.name[size]);
      if (fs.existsSync(dstPath)) {
        sails.log.debug(`MF local > process skip existing processed file: ${loadMediaFilesProcess.name[size]}`);
        continue;
      }
      let mediafileItem = loadMediaFilesProcess.config.resize[size];
      if (!mediafileItem) {
        mediafileItem = 240;
        sails.log.warn(`MediaFile size is not set for ${size}`);
      }
      await resizeMediaFile({ srcPath, dstPath, size: mediafileItem });
      sails.log.silly(`MF local > process finished: ${loadMediaFilesProcess.name[size]}`);
    }
  }

  private async handle(loadMediaFilesProcess: LoadMediaFilesProcess): Promise<void> {
    let { path: srcPath, fresh } = await this.download(loadMediaFilesProcess);
    if (loadMediaFilesProcess.type !== "image") return;

    try {
      await this.processImage(loadMediaFilesProcess, srcPath);
    } catch (error) {
      if (loadMediaFilesProcess.url.startsWith('file://')) throw error;
      // The source on disk is broken (e.g. a truncated file left by an older version):
      // it must not count as downloaded. Drop it and download once more.
      await fs.promises.unlink(srcPath).catch(() => {});
      if (fresh) throw error;
      sails.log.warn(`MF local > ${srcPath} is broken, downloading again: ${error}`);
      ({ path: srcPath } = await this.download(loadMediaFilesProcess));
      try {
        await this.processImage(loadMediaFilesProcess, srcPath);
      } catch (retryError) {
        await fs.promises.unlink(srcPath).catch(() => {});
        throw retryError;
      }
    }

    // A picture downloaded by its address keeps only its webp: the whole picture becomes `origin`, the
    // download goes. The origin in place is also what tells the next sync the picture is done - without
    // it the picture looked unfinished to every sync and was queued again.
    if (!loadMediaFilesProcess.url.startsWith('file://')) {
      await keepWebpOnly(srcPath, path.join(this.getPrefix(loadMediaFilesProcess.type), loadMediaFilesProcess.name.origin));
    }

    // Delete the original uploaded file if it was a file:// URL
    if (loadMediaFilesProcess.url.startsWith('file://')) {
      const uploadedFilePath = loadMediaFilesProcess.url.slice(7);
      try {
        if (fs.existsSync(uploadedFilePath)) {
          await fs.promises.unlink(uploadedFilePath);
          sails.log.debug(`MF local > deleted original uploaded file: ${uploadedFilePath}`);
        }
      } catch (unlinkError) {
        sails.log.warn(`MF local > failed to delete original file ${uploadedFilePath}: ${unlinkError.message}`);
      }
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
    try {
      const MEDIAFILE_PARALLEL_TO_DOWNLOAD = Number(await Settings.get('MEDIAFILE_PARALLEL_TO_DOWNLOAD')) || 3;

      while (this.loadMediaFilesProcessQueue.length) {
        const loadMediaFilesProcesses = this.loadMediaFilesProcessQueue.splice(0, MEDIAFILE_PARALLEL_TO_DOWNLOAD);
        await Promise.all(loadMediaFilesProcesses.map(async (loadMediaFilesProcess) => {
          try {
            await this.handle(loadMediaFilesProcess);
            loadMediaFilesProcess.resolve();
          } catch (error) {
            sails.log.error(`MF local Error > processing file ${loadMediaFilesProcess.name.origin}: ${error}`);
            loadMediaFilesProcess.reject(error instanceof Error ? error : new Error(String(error)));
          }
        }));
      }
    } catch (error) {
      sails.log.error("loadMediaFiles error:",error)
      // nothing in the queue may wait forever
      for (const item of this.loadMediaFilesProcessQueue.splice(0)) {
        item.reject(error instanceof Error ? error : new Error(String(error)));
      }
    } finally {
      this.processing = false
    }
    this.processingTimeout = setTimeout(this.loadMediaFiles.bind(this), 30000);
  }
}

/**
 * The whole downloaded picture as webp at `originPath`, and the download removed. A download whose address has no
 * extension is saved under the origin's own name: it is rewritten in place unless it is webp already.
 */
async function keepWebpOnly(downloadedPath: string, originPath: string): Promise<void> {
  const downloaded = path.resolve(downloadedPath);
  const origin = path.resolve(originPath);
  if (downloaded === origin) {
    if ((await sharp(downloaded).metadata()).format === 'webp') return;
  } else if (fs.existsSync(origin)) {
    await fs.promises.unlink(downloaded);
    return;
  }
  const converting = partPath(origin);
  try {
    await sharp(downloaded).webp().toFile(converting);
    await fs.promises.rename(converting, origin);
  } catch (error) {
    await fs.promises.unlink(converting).catch(() => {});
    throw error;
  }
  if (downloaded !== origin) await fs.promises.unlink(downloaded);
}

interface ResizeMediaFileOptions {
  srcPath: string;
  dstPath: string;
  size: number;
}

/** sharp picks the format by extension; a temporary name has none, so the format is given. */
function formatOf(dstPath: string): keyof sharp.FormatEnum {
  const ext = path.extname(dstPath).slice(1).toLowerCase();
  return (ext === 'jpg' ? 'jpeg' : ext) as keyof sharp.FormatEnum;
}

async function convertMediaFile({ srcPath, dstPath }: { srcPath: string, dstPath: string }): Promise<void> {
  const tmp = partPath(dstPath);
  try {
    await sharp(srcPath).toFormat(formatOf(dstPath)).toFile(tmp);
    await fs.promises.rename(tmp, dstPath);
  } catch (error) {
    await fs.promises.unlink(tmp).catch(() => {});
    sails.log.error(`MF local error > convertMediaFile:`, srcPath, dstPath);
    sails.log.error(error)
    throw error instanceof Error ? error : new Error(String(error));
  }
}

async function resizeMediaFile({ srcPath, dstPath, size  }: ResizeMediaFileOptions): Promise<void> {
  const tmp = partPath(dstPath);
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
      .toFormat(formatOf(dstPath))
      .toFile(tmp);
    await fs.promises.rename(tmp, dstPath);
  } catch (error) {
    await fs.promises.unlink(tmp).catch(() => {});
    sails.log.error(`MF local error > resizeMediaFile:`, srcPath, dstPath, size);
    sails.log.error(error)
    throw error instanceof Error ? error : new Error(String(error));
  }
}
