"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 *
 */
class MediaFile {
    constructor(url, name, key) {
        this.url = url;
        // TODO: переименовать нейм по идеи это размеры картинок + оригинал (передается оно в images)
        this.name = name;
        this.key = key;
    }
}
exports.default = MediaFile;
