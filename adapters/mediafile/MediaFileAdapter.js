"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
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
    async toProcess(url, target, type, force = false) {
        await this.wait();
        sails.log.silly(`Adapter > Mediafile > toProcess: ${url}`);
        let imageId = (0, uuid_1.v5)(url, this.UUID_NAMESPACE);
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
        }
        else {
            mediaFile = {
                id: imageId
            };
            mediaFile = await MediaFile.create(mediaFile).fetch();
            toDownload = true;
        }
        if (toDownload) {
            let loadConfig;
            if (target && this.config && this.config[target]) {
                loadConfig = this.config[target];
            }
            let originalFilePath = "";
            switch (type) {
                case "image":
                    const process = await this.process(url, "image", loadConfig);
                    mediaFile.images = process.variant;
                    originalFilePath = process.originalFilePath;
                    break;
                case "video":
                    // mediaFile.video = ???
                    break;
                case "audio":
                    // mediaFile.audio = ???
                    break;
                default:
                    throw `mediaFile type not known ${type}`;
                    break;
            }
            /**
             * The problem remains that we cannot know whether the picture has loaded or not, and therefore. if it doesn't exist you need to somehow remove MF
             */
            mediaFile = (await MediaFile.update({ id: imageId }, { images: mediaFile.images, original: url, originalFilePath, type }).fetch())[0];
        }
        return mediaFile;
    }
    ;
}
exports.default = MediaFileAdapter;
