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
        baseName += ext;
        return baseName;
    }
    async load(url, type, config) {
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
        const mediafileExtesion = url.match(/\.([0-9a-z]+)(?=[?#])|(\.)(?:[\w]+)$/gim)[0];
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
        return name;
    }
    async download(loadMediaFilesProcess) {
        const prefix = path.join(process.cwd(), ".tmp/public", loadMediaFilesProcess.type);
        const fullPathDl = path.join(prefix, loadMediaFilesProcess.name.origin);
        const response = await axios_1.default.get(loadMediaFilesProcess.url, { responseType: 'stream' });
        fs.mkdirSync(prefix, { recursive: true });
        const writer = fs.createWriteStream(fullPathDl);
        response.data.pipe(writer);
        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });
    }
    async loadMediaFiles() {
        const MEDIAFILE_PARALEL_TO_DOWNLOAD = await Settings.get('MEDIAFILE_PARALEL_TO_DOWNLOAD') ?? 3;
        while (this.loadMediaFilesProcessQueue.length) {
            const loadMediaFilesProcesses = this.loadMediaFilesProcessQueue.splice(0, MEDIAFILE_PARALEL_TO_DOWNLOAD);
            const downloadPromises = loadMediaFilesProcesses.map(async (loadMediaFilesProcess) => {
                const prefix = await this.download(loadMediaFilesProcess);
                switch (loadMediaFilesProcess.type) {
                    case "image":
                        for (let size in loadMediaFilesProcess.config.resize) {
                            if (size === "origin")
                                continue;
                            const mediafileItem = loadMediaFilesProcess.config.resize[size];
                            if (!mediafileItem.width && !mediafileItem.height) {
                                throw "Not valid mediafile config. Must have name (key) and one of width or height";
                            }
                            mediafileItem.width = mediafileItem.width || mediafileItem.height;
                            mediafileItem.height = mediafileItem.height || mediafileItem.width;
                            await resizeMediaFile({
                                srcPath: path.normalize(prefix + loadMediaFilesProcess.name.origin),
                                dstPath: path.normalize(prefix + loadMediaFilesProcess.name[size]),
                                width: mediafileItem.width,
                                height: mediafileItem.height,
                                customArgs: ["-background", loadMediaFilesProcess.config.background || "white", "-flatten"],
                            });
                        }
                        break;
                    default:
                        break;
                }
            });
            // Wait for all downloads and processing to complete
            await Promise.all(downloadPromises);
        }
        setTimeout(this.loadMediaFiles.bind(this), 10000);
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
