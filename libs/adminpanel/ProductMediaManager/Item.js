"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImageItem = void 0;
const AbstractMediaManager_1 = require("sails-adminpanel/lib/media-manager/AbstractMediaManager");
const MediaManagerHelper_1 = require("sails-adminpanel/lib/media-manager/helpers/MediaManagerHelper");
const image_size_1 = __importDefault(require("image-size"));
const sharp_1 = __importDefault(require("sharp"));
class ImageItem extends AbstractMediaManager_1.File {
    constructor(path, dir, model, metaModel) {
        super(path, dir, model, metaModel);
        this.type = "image";
    }
    async getItems(limit, skip, sort) {
        let data = await sails.models[this.model].find({
            where: { parent: null, mimeType: { contains: this.type } },
            limit: limit,
            skip: skip,
            sort: sort //@ts-ignore
        }).populate('children', { sort: sort });
        let next = (await sails.models[this.model].find({
            where: { parent: null, mimeType: { contains: this.type } },
            limit: limit,
            skip: skip === 0 ? limit : skip + limit,
            sort: sort
        })).length;
        return {
            data: data,
            next: !!next
        };
    }
    async search(s) {
        return await sails.models[this.model].find({
            where: { filename: { contains: s }, mimeType: { contains: this.type }, parent: null },
            sort: 'createdAt DESC'
        }).populate('children', { sort: 'createdAt DESC' });
    }
    async upload(file, filename, origFileName, imageSizes) {
        let parent = await sails.models[this.model].create({
            parent: null,
            mimeType: file.type,
            size: file.size,
            path: file.fd,
            cropType: 'origin',
            filename: origFileName,
            image_size: (0, image_size_1.default)(file.fd),
            url: `/${this.path}/${filename}`
        }).fetch();
        await this.createEmptyMeta(parent.id);
        if (parent.image_size.width > 150 && parent.image_size.height > 150) {
            await this.createThumb(parent.id, file, filename, origFileName);
        }
        if (Object.keys(imageSizes).length) {
            await this.createSizes(file, parent, filename, imageSizes);
        }
        return sails.models[this.model].find({
            where: { id: parent.id }
        }).populate('children');
    }
    async getChildren(id) {
        return (await sails.models[this.model].findOne({
            where: { id: id }
        }).populate('children', { sort: 'createdAt DESC' })).children;
    }
    async createSizes(file, parent, filename, imageSizes) {
        for (const sizeKey of Object.keys(imageSizes)) {
            let sizeName = (0, MediaManagerHelper_1.randomFileName)(filename, sizeKey, false);
            let { width, height } = imageSizes[sizeKey];
            if (parent.image_size.width < width || parent.image_size.height < height)
                continue;
            let newFile = await this.resizeImage(file.fd, `${this.dir}${sizeName}`, width, height);
            await sails.models[this.model].create({
                parent: parent.id,
                mimeType: parent.mimeType,
                size: newFile.size,
                filename: parent.filename,
                path: `${this.dir}${sizeName}`,
                cropType: sizeKey,
                image_size: (0, image_size_1.default)(`${this.dir}${sizeName}`),
                url: `/${this.path}/${sizeName}`
            });
        }
    }
    async createThumb(id, file, filename, origFileName) {
        const thumbName = (0, MediaManagerHelper_1.randomFileName)(filename, 'thumb', false);
        const thumb = await this.resizeImage(file.fd, `${this.dir}${thumbName}`, 150, 150);
        await sails.models[this.model].create({
            parent: id,
            mimeType: file.type,
            size: thumb.size,
            cropType: 'thumb',
            path: `${this.dir}${thumbName}`,
            filename: origFileName,
            image_size: (0, image_size_1.default)(`${this.dir}${thumbName}`),
            url: `/${this.path}/${thumbName}`
        });
    }
    async createEmptyMeta(id) {
        //create empty meta
        let metaData = {
            author: "",
            description: "",
            title: ""
        };
        for (const key of Object.keys(metaData)) {
            await sails.models[this.metaModel].create({
                key: key,
                value: metaData[key],
                parent: id
            });
        }
    }
    async getMeta(id) {
        return (await sails.models[this.model].findOne(id).populate('meta')).meta;
    }
    async setMeta(id, data) {
        for (const key of Object.keys(data)) {
            await sails.models[this.metaModel].update({ parent: id, key: key }, { value: data[key] });
        }
        return { msg: "success" };
    }
    async resizeImage(input, output, width, height) {
        return await (0, sharp_1.default)(input)
            .resize({ width: width, height: height })
            .toFile(output);
    }
    async uploadCropped(parent, file, filename, config) {
        return await sails.models[this.model].create({
            parent: parent.id,
            mimeType: file.type,
            size: file.size,
            path: file.fd,
            cropType: `${config.width}x${config.height}`,
            filename: parent.filename,
            image_size: (0, image_size_1.default)(file.fd),
            url: `/${this.path}/${filename}`
        }).fetch();
    }
    async delete(id) {
        await sails.models[this.model].destroy({ where: { id: id } }).fetch();
    }
}
exports.ImageItem = ImageItem;
