"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const MediaFileAdapter_1 = require("../MediaFileAdapter");
const MediaFile_1 = require("../MediaFile");
const fs = require("fs");
const request = require("request");
const uuid_1 = require("uuid");
const UUID_NAMESPACE = process.env.UUID_NAMESPACE || "1b671a64-40d5-491e-99b0-da01ff1f3341";
const IM = require("imagemagick");
const path = require("path");
let loadMediaFilesProcess = null;
let loadMediaFilesProcessQueue = [];
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
        if (!loadMediaFilesProcess) {
            loadMediaFilesProcess = this.loadMediaFiles();
        }
    }
    async load(url, key) {
        sails.log.verbose("MediaFileAdapter > load >", url);
        const conf = this.config[key];
        var mediafileExtesion = url.match(/\.([0-9a-z]+)(?=[?#])|(\.)(?:[\w]+)$/gim)[0];
        const filename = conf.path + "/" + (0, uuid_1.v5)(url, UUID_NAMESPACE) + mediafileExtesion;
        const name = {
            origin: filename,
        };
        for (let res in this.config[key].resize) {
            name[res] = conf.path + "/" + (0, uuid_1.v5)(url, UUID_NAMESPACE) + "." + conf.format;
        }
        const mediafile = new MediaFile_1.default(url, name, key);
        loadMediaFilesProcessQueue.push(mediafile);
        return mediafile.name;
    }
    uploadMediaFile(uploadFile, key) {
        throw new Error("Method not implemented.");
    }
    download(url, key, filename) {
        const prefix = process.cwd() + "/.tmp/public";
        const dir = prefix + this.config[key].path;
        filename = prefix + filename;
        sails.log.verbose("IMAGE ADAPTER LOCAL save file: ", filename);
        return new Promise((resolve, reject) => {
            request.head(url, (err) => {
                if (err)
                    return reject(err);
                fs.exists(this.config[key].path, async (exists) => {
                    if (!exists) {
                        fs.mkdirSync(dir, { recursive: true });
                    }
                    request(url)
                        .on("response", function (response) {
                        sails.log.verbose("LocalMediaFileAdapter > download > statusCode >", url, response.statusCode);
                    })
                        .on("error", function (err) {
                        sails.log.error("LocalMediaFileAdapter > download > error >", url, err);
                        return reject(err);
                    })
                        .pipe(fs.createWriteStream(filename))
                        .on("finish", function () {
                        sails.log.verbose("LocalMediaFileAdapter > download > success >", url);
                        return resolve(prefix);
                    });
                });
            });
        });
    }
    async loadMediaFiles() {
        try {
            while (loadMediaFilesProcessQueue.length) {
                const mediafile = loadMediaFilesProcessQueue.shift();
                const conf = this.config[mediafile.key];
                // Load mediafiles
                sails.log.verbose("MediaFileAdapter > loadMediaFiles > load", mediafile.name.origin);
                const prefix = await this.download(mediafile.url, mediafile.key, mediafile.name.origin);
                // resize MediaFiles
                sails.log.verbose("MediaFileAdapter > loadMediaFiles > resize", mediafile.name.origin);
                for (let size in conf.resize) {
                    if (size === "origin")
                        continue;
                    const mediafileItem = conf.resize[size];
                    if (!mediafileItem.width && !mediafileItem.height) {
                        // noinspection ExceptionCaughtLocallyJS
                        throw "Not valid mediafile config. Must have name (key) and one of width or height";
                    }
                    mediafileItem.width = mediafileItem.width || mediafileItem.height;
                    mediafileItem.height = mediafileItem.height || mediafileItem.width;
                    //TODO: except for PNF transparent resize
                    // https://mediafilemagick.org/script/color.php color list
                    await resizeMediaFile({
                        srcPath: path.normalize(prefix + mediafile.name.origin),
                        dstPath: path.normalize(prefix + mediafile.name[size]),
                        width: mediafileItem.width,
                        height: mediafileItem.height,
                        customArgs: ["-background", conf.background || "white", "-flatten"],
                    });
                }
                sails.log.verbose("MediaFileAdapter > loadMediaFiles > end >", mediafile.url);
            }
        }
        catch (e) {
            sails.log.error("MediaFileAdapter > loadMediaFiles > error2", e);
        }
        finally {
            setTimeout(this.loadMediaFiles.bind(this), 10000);
        }
    }
}
exports.default = LocalMediaFileAdapter;
function resizeMediaFile(opts) {
    return new Promise((resolve, reject) => {
        IM.resize(opts, function (err, stdout, stderr) {
            if (err) {
                sails.log.error(stderr);
                reject(err);
            }
            resolve(stdout);
        });
    });
}
