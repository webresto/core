"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImageItem = void 0;
const adminizer_1 = require("adminizer");
const ConvertType_1 = require("./helpers/ConvertType");
// todo: fix types model instance to {%ModelName%}Record for MediaFile';
const fs = require('fs').promises;
const path = require('path');
class ImageItem extends adminizer_1.File {
    constructor(urlPathPrefix, fileStoragePath) {
        super(urlPathPrefix, fileStoragePath);
        this.type = "image";
    }
    getMeta(id) {
        throw new Error('Method not implemented.');
    }
    async upload(file, filename, origFileName, group) {
        sails.log.debug(`ImageItem.upload called with file:`, {
            fieldname: file.fieldname,
            originalname: file.originalname,
            encoding: file.encoding,
            mimetype: file.mimetype,
            destination: file.destination,
            filename: file.filename,
            path: file.path,
            size: file.size
        });
        const mfAdater = await Adapter.getMediaFileAdapter();
        const filePath = file.path || file.fd;
        sails.log.debug(`Using file path: ${filePath}`);
        const mediaFile = await mfAdater.toProcess(`file://${filePath}`, "dish", "image");
        let parent = ConvertType_1.ConvertType.MF2Item(mediaFile);
        return [parent];
    }
    setMeta(id, data) {
        throw new Error('Method not implemented.');
    }
    getVariants(id) {
        throw new Error('Method not implemented.');
    }
    uploadVariant(item, file, fileName, group, localeId) {
        throw new Error('Method not implemented.');
    }
    async getOrigin(id) {
        const mf = await MediaFile.findOne({ where: { id: id } });
        if (!mf) {
            throw `get origin fail with id: ${id}`;
        }
        return (mf.originalFilePath || mf.original || '');
    }
    async getItems(limit, skip, sort) {
        let mediaFiles = await MediaFile.find({
            where: { type: this.type },
            limit: limit,
            skip: skip,
            sort: sort //@ts-ignore
        });
        let totalCount = (await MediaFile.count({
            where: { type: this.type }
        }));
        let next = (skip + limit) < totalCount;
        return {
            data: ConvertType_1.ConvertType.MF2Item(mediaFiles),
            next: next
        };
    }
    async search(s) {
        return [];
    }
    async delete(id) {
        const destroyed = await MediaFile.destroy({ where: { id: id } }).fetch();
        return destroyed.length > 0;
    }
}
exports.ImageItem = ImageItem;
