"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const MediaFileAdapter_1 = __importDefault(require("../MediaFileAdapter"));
const fs = __importStar(require("fs"));
const axios_1 = __importDefault(require("axios"));
const uuid_1 = require("uuid");
const path = __importStar(require("path"));
//@ts-ignore
const sharp_1 = __importDefault(require("sharp"));
class LocalMediaFileAdapter extends MediaFileAdapter_1.default {
    /** /////////////////////////////////
     * Process
     */ /////////////////////////////////
    async process(url, type, config) {
        const baseConfig = {
            format: "webp",
            resize: {
                small: 512,
                large: 1024
            }
        };
        const cfg = { ...baseConfig, ...config };
        const isFilePath = url.match(/\.([0-9a-z]+)(?=[?#])|(\.)(?:[\w]+)$/gim);
        let mediafileExtension = '';
        if (isFilePath && isFilePath.length > 0) {
            mediafileExtension = isFilePath[0].replace('.', '');
        }
        const origin = this.getNameByUrl(url, mediafileExtension);
        const name = {
            origin: origin,
            small: undefined,
            large: undefined
        };
        for (let res in cfg.resize) {
            name[res] = this.getNameByUrl(url, cfg.format, cfg, res);
        }
        const that = this;
        async function processFile(url, type) {
            if (url.startsWith('file://')) {
                try {
                    const fullPathDl = that.getOriginalFilePath(url, type, true);
                    const localFilePath = url.slice(7);
                    sails.log.silly(`MF local > copy file: ${localFilePath} to ${fullPathDl}`);
                    const prefix = that.getPrefix(type, false);
                    // Await each async operation to ensure completion before moving to the next step
                    await fs.promises.mkdir(prefix, { recursive: true });
                    await fs.promises.copyFile(localFilePath, fullPathDl);
                    await fs.promises.unlink(localFilePath);
                    sails.log.debug(`File copied and original deleted successfully. ${url}, ${fullPathDl}`);
                }
                catch (error) {
                    sails.log.error(`Failed to process file: ${error.message}`);
                    sails.log.error(error);
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
        let result = {};
        for (const key in name) {
            if (typeof name[key] === "string") {
                result[key] = "/" + type + "/" + name[key];
            }
        }
        return {
            variant: result,
            originalFilePath: this.getOriginalFilePath(url, type)
        };
    }
    async checkFileExist(mediaFile) {
        let allFileExist = true;
        if (mediaFile && /* mediaFile.type === "image" && **/ typeof mediaFile.images === "object" && mediaFile.images !== null && Object.keys(mediaFile.images).length) {
            const images = mediaFile.images;
            for (const key in images) {
                const imageFilePath = path.join(this.getPrefix(), images[key]);
                try {
                    await fs.promises.access(imageFilePath, fs.constants.F_OK);
                }
                catch (error) {
                    // If the file does not exist, set the allFileExist flag to false
                    sails.log.debug(`LocalMediaFileAdapter > file not exist: ${imageFilePath}`);
                    allFileExist = false;
                }
            }
        }
        return allFileExist;
    }
    constructor(config) {
        super(config);
        this.processing = false;
        this.loadMediaFilesProcessQueue = [];
        this.loadMediaFiles();
    }
    getNameByUrl(url, ext, options, salt = null) {
        let baseName = url;
        if (options)
            baseName += JSON.stringify(options);
        baseName = (0, uuid_1.v5)(baseName, this.UUID_NAMESPACE);
        if (salt) {
            baseName += `-${salt.toString().toLowerCase().replace(/[^a-zA-Z]+/g, "").substring(0, 7)}`;
            //baseName += `-${Math.floor(Date.now() / 1000)}`
        }
        baseName += `.${ext}`;
        return baseName;
    }
    getPrefix(type, absolute = true) {
        const basePath = type ? path.join(".tmp/public", type) : path.join(".tmp/public");
        return absolute ? path.resolve(basePath) : basePath;
    }
    getOriginalFilePath(url, type, absolute = false) {
        const prefix = this.getPrefix(type, absolute);
        const isFilePath = url.match(/\.([0-9a-z]+)(?=[?#])|(\.)(?:[\w]+)$/gim);
        let mediafileExtension = '';
        if (isFilePath && isFilePath.length > 0) {
            mediafileExtension = isFilePath[0].replace('.', '');
        }
        const originalFilePath = path.join(prefix, this.getNameByUrl(url, mediafileExtension));
        return originalFilePath;
    }
    async download(loadMediaFilesProcess) {
        const prefix = this.getPrefix(loadMediaFilesProcess.type);
        const fullPathDl = this.getOriginalFilePath(loadMediaFilesProcess.url, loadMediaFilesProcess.type, true);
        // Check if file exists
        if (!fs.existsSync(fullPathDl)) {
            let response;
            const url = loadMediaFilesProcess.url;
            if (url.startsWith('http://') || url.startsWith('https://')) {
                // Handle HTTP/HTTPS URL
                response = await axios_1.default.get(url, { responseType: 'stream', maxRedirects: 5 });
                sails.log.silly(`MF local > download image: ${fullPathDl}, status: ${response.status}`);
                fs.mkdirSync(prefix, { recursive: true });
                const writer = fs.createWriteStream(fullPathDl);
                response.data.pipe(writer);
                await new Promise((resolve, reject) => {
                    writer.on('finish', resolve);
                    writer.on('error', reject);
                });
            }
            else {
                sails.log.error(`Unsupported URL protocol: ${url}`);
            }
        }
        else {
            sails.log.silly(`File ${fullPathDl} already exists. Skipping download.`);
        }
        return fullPathDl;
    }
    async loadMediaFiles() {
        if (this.processing) {
            return;
        }
        if (this.loadMediaFilesProcessQueue.length === 0) {
            sails.log.silly(`MF local > no mediafiles to download`);
            this.processingTimeout = setTimeout(this.loadMediaFiles.bind(this), 30000);
            return;
        }
        try {
            this.processing = true;
            let MEDIAFILE_PARALLEL_TO_DOWNLOAD = await Settings.get('MEDIAFILE_PARALLEL_TO_DOWNLOAD') ?? 3;
            if (MEDIAFILE_PARALLEL_TO_DOWNLOAD > this.loadMediaFilesProcessQueue.length)
                MEDIAFILE_PARALLEL_TO_DOWNLOAD = this.loadMediaFilesProcessQueue.length;
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
                                    }
                                    else {
                                        sails.log.debug(`MF local > process skip existing processed file: ${loadMediaFilesProcess.name[size]}`);
                                    }
                                }
                                break;
                            default:
                                break;
                        }
                    }
                    catch (error) {
                        // Log the error and rethrow it
                        sails.log.error(`MF local Error > processing file ${loadMediaFilesProcess.name.origin}: ${error}`);
                    }
                });
                try {
                    // Wait for all downloads and processing to complete
                    await Promise.all(downloadPromises);
                }
                catch (error) {
                    // Handle errors that occurred during processing
                    sails.log.error(`MF local Error > file processing: ${error}`);
                }
            }
            this.processing = false;
        }
        catch (error) {
            sails.log.error("loadMediaFiles error:", error);
        }
        this.processingTimeout = setTimeout(this.loadMediaFiles.bind(this), 30000);
    }
}
exports.default = LocalMediaFileAdapter;
async function resizeMediaFile({ srcPath, dstPath, size }) {
    try {
        const { width, height } = await (0, sharp_1.default)(srcPath).metadata();
        // Determine which side is smaller
        let resizeWidth, resizeHeight;
        if (width > height) {
            resizeWidth = Math.round(size * (width / height));
            resizeHeight = size;
        }
        else {
            resizeWidth = size;
            resizeHeight = Math.round(size * (height / width));
        }
        // If no background color or no alpha channel, simply resize the image
        await (0, sharp_1.default)(srcPath)
            .resize(resizeWidth, resizeHeight)
            .toFile(dstPath);
    }
    catch (error) {
        sails.log.error(`MF local error > resizeMediaFile:`, srcPath, dstPath, size);
        sails.log.error(error);
        throw new Error(error);
    }
}
