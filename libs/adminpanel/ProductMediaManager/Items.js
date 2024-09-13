"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImageItem = void 0;
const AbstractMediaManager_1 = require("sails-adminpanel/lib/media-manager/AbstractMediaManager");
const sharp_1 = __importDefault(require("sharp"));
class ImageItem extends AbstractMediaManager_1.File {
    constructor(path, dir, model, metaModel) {
        super(path, dir, null, null);
        this.type = "image";
    }
    MF2Item(mf) {
        let processItem = (mfItem) => {
            return {
                id: mfItem.id,
                parent: null,
                children: [],
                mimeType: 'image/*',
                path: mfItem.original,
                size: 0,
                image_size: {
                    width: 0,
                    height: 0,
                    type: ''
                },
                cropType: '',
                url: mfItem.variant.origin,
                filename: '',
                meta: []
            };
        };
        if (Array.isArray(mf)) {
            return mf.map((mfItem) => processItem(mfItem));
        }
        else {
            return processItem(mf);
        }
    }
    Item2MF(itemOrItems) {
        let processItem = (item) => {
            return {
                id: item.id,
                original: item.path,
                variant: {
                    origin: item.url
                }
            };
        };
        if (Array.isArray(itemOrItems)) {
            return itemOrItems.map((item) => processItem(item));
        }
        else {
            return processItem(itemOrItems);
        }
    }
    async getItems(limit, skip, sort) {
        let mediaFiles = await MediaFile.find({
            where: { type: this.type },
            limit: limit,
            skip: skip,
            sort: sort //@ts-ignore
        }).populate('children', { sort: sort });
        let next = (await MediaFile.count({
            where: { type: this.type },
            limit: limit,
            skip: skip === 0 ? limit : skip + limit,
            sort: sort
        }));
        return {
            data: this.MF2Item(mediaFiles),
            next: !!next
        };
    }
    async search(s) {
        return [];
        // return await MediaFile.find({
        // 	where: {filename: {contains: s}, mimeType: { contains: this.type}, parent: null},
        // 	sort: 'createdAt DESC'
        // }).populate('children', {sort: 'createdAt DESC'})
    }
    async upload(file, filename, origFileName, imageSizes) {
        let parent = await MediaFile.create(this.Item2MF({
            parent: null,
            mimeType: file.type,
            size: file.size,
            path: file.fd,
            cropType: 'origin',
            filename: origFileName,
            image_size: null,
            url: `/${this.path}/${filename}`
        })).fetch();
        if (Object.keys(imageSizes).length) {
            await this.createSizes(file, parent, filename, imageSizes);
        }
        return this.MF2Item(await MediaFile.findOne({
            where: { id: parent.id }
        }));
    }
    async getChildren(id) {
        return [];
        return (await MediaFile.findOne({
            where: { id: id }
        }).populate('children', { sort: 'createdAt DESC' })).children;
    }
    async createSizes(file, parent, filename, imageSizes) {
        console.log("SIZES");
        // for (const sizeKey of Object.keys(imageSizes)) {
        // 	let sizeName = randomFileName(filename, sizeKey, false)
        // 	let {width, height} = imageSizes[sizeKey]
        // 	if (parent.image_size.width < width || parent.image_size.height < height) continue
        // 	let newFile = await this.resizeImage(file.fd, `${this.dir}${sizeName}`, width, height)
        // 	await MediaFile.create(this.Item2MF({
        // 		parent: parent.id,
        // 		mimeType: parent.mimeType,
        // 		size: newFile.size,
        // 		filename: parent.filename,
        // 		path: `${this.dir}${sizeName}`,
        // 		cropType: sizeKey,
        // 		url: `/${this.path}/${sizeName}`
        // 	}))
        // }
    }
    async createThumb(id, file, filename, origFileName) {
        // const thumbName = randomFileName(filename, 'thumb', false)
        // const thumb = await this.resizeImage(file.fd, `${this.dir}${thumbName}`, 150, 150)
        // await MediaFile.create({
        // 	parent: id,
        // 	mimeType: file.type,
        // 	size: thumb.size,
        // 	cropType: 'thumb',
        // 	path: `${this.dir}${thumbName}`,
        // 	filename: origFileName,
        // 	image_size: sizeOf(`${this.dir}${thumbName}`),
        // 	url: `/${this.path}/${thumbName}`
        // })
    }
    async createEmptyMeta(id) {
        //create empty meta
        // let metaData: Meta = {
        // 	author: "",
        // 	description: "",
        // 	title: ""
        // }
        // for (const key of Object.keys(metaData)) {
        // 	await sails.models[this.metaModel].create({
        // 		key: key,
        // 		value: metaData[key],
        // 		parent: id
        // 	})
        // }
    }
    async getMeta(id) {
        return [];
        return (await MediaFile.findOne(id).populate('meta')).meta;
    }
    async setMeta(id, data) {
        // for (const key of Object.keys(data)) {
        // 	await sails.models[this.metaModel].update({parent: id, key: key}, {value: data[key]})
        // }
        return { msg: "success" };
    }
    async resizeImage(input, output, width, height) {
        return await (0, sharp_1.default)(input)
            .resize({ width: width, height: height })
            .toFile(output);
    }
    async uploadCropped(parent, file, filename, config) {
        return null;
        // return await MediaFile.create({
        // 	parent: parent.id,
        // 	mimeType: file.type,
        // 	size: file.size,
        // 	path: file.fd,
        // 	cropType: `${config.width}x${config.height}`,
        // 	filename: parent.filename,
        // 	image_size: sizeOf(file.fd),
        // 	url: `/${this.path}/${filename}`
        // }).fetch()
    }
    async delete(id) {
        await MediaFile.destroy({ where: { id: id } }).fetch();
    }
}
exports.ImageItem = ImageItem;
