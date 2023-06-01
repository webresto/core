"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 *
 */
class MediaFile {
    url;
    name;
    key;
    constructor(url, name, key) {
        this.url = url;
        // TODO: переименовать нейм по идеи это размеры картинок + оригинал (передается оно в images)
        this.name = name;
        this.key = key;
    }
}
exports.default = MediaFile;
