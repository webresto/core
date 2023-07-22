"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const MediaFileAdapter_1 = require("../MediaFileAdapter");
const fs = require("fs");
const axios_1 = require("axios");
const uuid_1 = require("uuid");
const IM = require("imagemagick");
const path = require("path");
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
class LocalMediaFileAdapter extends MediaFileAdapter_1.default {
    constructor(config) {
        super(config);
        this.processing = false;
        this.loadMediaFilesProcessQueue = [];
        this.loadMediaFiles();
    }
    getNameByUrl(url, ext, options, salt = false) {
        let baseName = url;
        if (options)
            baseName += JSON.stringify(options);
        baseName = (0, uuid_1.v5)(baseName, this.UUID_NAMESPACE);
        if (salt)
            baseName += `-${(new Date()).getTime()}`;
        baseName += `.${ext}`;
        return baseName;
    }
    async process(url, type, config) {
        const baseConfig = {
            format: "webp",
            resize: {
                small: {
                    width: 360,
                    height: 360
                },
                large: {
                    width: 720,
                    height: 720
                }
            },
            background: "white"
        };
        const cfg = { ...baseConfig, ...config };
        const mediafileExtesion = url.match(/\.([0-9a-z]+)(?=[?#])|(\.)(?:[\w]+)$/gim)[0].replace('.', '');
        const origin = this.getNameByUrl(url, mediafileExtesion);
        const name = {
            origin: origin,
            small: undefined,
            large: undefined
        };
        for (let res in cfg.resize) {
            name[res] = this.getNameByUrl(url, cfg.format, cfg, true);
        }
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
        return result;
    }
    getPrefix(type) {
        return path.join(process.cwd(), ".tmp/public", type);
    }
    async download(loadMediaFilesProcess) {
        const prefix = this.getPrefix(loadMediaFilesProcess.type);
        const fullPathDl = path.join(prefix, loadMediaFilesProcess.name.origin);
        // Check if file exists
        if (!fs.existsSync(fullPathDl)) {
            const response = await axios_1.default.get(loadMediaFilesProcess.url, { responseType: 'stream' });
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
            sails.log.silly(`File ${fullPathDl} already exists. Skipping download.`);
        }
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
        this.processing = true;
        let MEDIAFILE_PARALEL_TO_DOWNLOAD = await Settings.get('MEDIAFILE_PARALEL_TO_DOWNLOAD') ?? 3;
        if (MEDIAFILE_PARALEL_TO_DOWNLOAD > this.loadMediaFilesProcessQueue.length)
            MEDIAFILE_PARALEL_TO_DOWNLOAD = this.loadMediaFilesProcessQueue.length;
        while (this.loadMediaFilesProcessQueue.length) {
            const loadMediaFilesProcesses = this.loadMediaFilesProcessQueue.splice(0, MEDIAFILE_PARALEL_TO_DOWNLOAD);
            const downloadPromises = loadMediaFilesProcesses.map((loadMediaFilesProcess) => {
                return this.download(loadMediaFilesProcess).then(async () => {
                    const prefix = this.getPrefix(loadMediaFilesProcess.type);
                    switch (loadMediaFilesProcess.type) {
                        case "image":
                            sails.log.silly(`MF local > process image: ${loadMediaFilesProcess.name.origin}`);
                            for (let size in loadMediaFilesProcess.config.resize) {
                                const dstPath = path.join(prefix, loadMediaFilesProcess.name[size]);
                                if (!fs.existsSync(dstPath)) {
                                    if (size === "origin")
                                        continue;
                                    const mediafileItem = loadMediaFilesProcess.config.resize[size];
                                    if (!mediafileItem.width && !mediafileItem.height) {
                                        throw "Not valid mediafile config. Must have name (key) and one of width or height";
                                    }
                                    mediafileItem.width = mediafileItem.width || mediafileItem.height;
                                    mediafileItem.height = mediafileItem.height || mediafileItem.width;
                                    await resizeMediaFile({
                                        srcPath: path.join(prefix, loadMediaFilesProcess.name.origin),
                                        dstPath: path.join(prefix, loadMediaFilesProcess.name[size]),
                                        width: mediafileItem.width,
                                        height: mediafileItem.height,
                                        customArgs: ["-background", loadMediaFilesProcess.config.background || "white", "-flatten"],
                                    });
                                    sails.log.silly(`MF local > process finished: ${loadMediaFilesProcess.name[size]}`);
                                }
                                else {
                                    sails.log.silly(`MF local > process skip existing processed file: ${loadMediaFilesProcess.name[size]}`);
                                }
                            }
                            break;
                        default:
                            break;
                    }
                }).catch(error => {
                    // Log the error and rethrow it
                    sails.log.error(`Error processing file ${loadMediaFilesProcess.name.origin}: ${error}`);
                });
            });
            try {
                // Wait for all downloads and processing to complete
                await Promise.all(downloadPromises);
            }
            catch (error) {
                // Handle errors that occurred during processing
                sails.log.error(`An error occurred during file processing: ${error}`);
            }
        }
        this.processing = false;
        this.processingTimeout = setTimeout(this.loadMediaFiles.bind(this), 30000);
    }
}
exports.default = LocalMediaFileAdapter;
function resizeMediaFile(opts) {
    return new Promise((resolve, reject) => {
        IM.resize(opts, function (err, stdout, stderr) {
            if (err) {
                reject(err);
            }
            resolve(stdout);
        });
    });
}
