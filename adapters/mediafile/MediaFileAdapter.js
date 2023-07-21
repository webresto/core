"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
;
class MediaFileAdapter {
    constructor(config) {
        this.config = config;
        this.initializationPromise = this.initialize();
    }
    /**
     * Async constructor
     */
    async initialize() {
        this.UUID_NAMESPACE = await Settings.get("UUID_NAMESPACE") ?? "9dbceb30-26c3-11ee-be56-0242ac120002";
    }
    /**
     * Waiting for initialization
     */
    async wait() {
        await this.initializationPromise;
    }
    async toDownload(url, target, type, force = false) {
        await this.wait();
        sails.log.silly(`Adapter > Mediafile > toDownload: ${url}`);
        let imageId = (0, uuid_1.v5)(url, this.UUID_NAMESPACE);
        let mediaFile = await MediaFile.findOne({ id: imageId });
        let loadConfig;
        if (target && this.config && this.config[target]) {
            loadConfig = this.config[target];
        }
        // image     
        if (mediaFile === undefined || force) {
            mediaFile = {
                id: imageId
            };
            switch (type) {
                case "image":
                    mediaFile.images = this.process(url, "image", loadConfig);
                    break;
                case "video":
                    // mediaFile.video = ???
                    break;
                case "sound":
                    // mediaFile.sound = ???
                    break;
                default:
                    throw `mediaFile type not known ${type}`;
                    break;
            }
            mediaFile = await MediaFile.create(mediaFile).fetch();
        }
        return mediaFile;
    }
    ;
}
exports.default = MediaFileAdapter;
