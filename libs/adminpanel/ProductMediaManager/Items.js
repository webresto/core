"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImageItem = void 0;
const AbstractMediaManager_1 = require("sails-adminpanel/lib/media-manager/AbstractMediaManager");
const ConvertType_1 = require("./helpers/ConvertType");
// todo: fix types model instance to {%ModelName%}Record for MediaFile';
const fs = require('fs').promises;
const path = require('path');
class ImageItem extends AbstractMediaManager_1.File {
    constructor() {
        super(...arguments);
        this.type = "image";
    }
    getMeta(id) {
        throw new Error('Method not implemented.');
    }
    async upload(file, filename, origFileName, group) {
        const destinationPath = path.join(this.dir, filename);
        // Check if the file exists at the given fd path
        try {
            await fs.access(file.fd);
        }
        catch (error) {
            sails.log.error(`File not found at path: ${file.fd}`);
            throw new Error(`File not found: ${file.fd}`);
        }
        console.log(">>>>", destinationPath);
        // Ensure the destination directory exists
        const destinationDir = path.dirname(destinationPath);
        try {
            await fs.mkdir(destinationDir, { recursive: true });
        }
        catch (error) {
            sails.log.error(`Failed to create directory: ${destinationDir}`);
            throw new Error(`Could not create directory: ${destinationDir}`);
        }
        // TODO: possibe diffenrent block device
        await fs.rename(file.fd, destinationPath);
        // try {
        // 	await fs.unlink(file.fd);
        // } catch (e) {
        // 	sails.log.error(e);
        // }
        let parent = ConvertType_1.ConvertType.MF2Item(await MediaFile.create(ConvertType_1.ConvertType.Item2MF({
            parent: null,
            mimeType: file.type,
            size: file.size,
            path: destinationPath,
            group: group,
            tag: "origin",
            filename: origFileName,
            url: `${this.path}/${filename}`,
        })).fetch());
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
        return path.resolve(process.cwd(), mf.originalFilePath || mf.original || '');
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
            data: ConvertType_1.ConvertType.MF2Item(mediaFiles),
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
    // public async upload2(file: UploaderFile, filename: string, origFileName: string, imageSizes?: imageSizes | {}): Promise<MediaManagerItem> {
    // 	let parent = await MediaFile.create(this.Item2MF({
    // 		parent: null,
    // 		mimeType: file.type,
    // 		size: file.size,
    // 		path: file.fd,
    // 		cropType: 'origin',
    // 		filename: origFileName,
    // 		image_size: null,
    // 		url: `/${this.path}/${filename}`
    // 	})).fetch();
    // 	if (Object.keys(imageSizes).length) {
    // 		await this.createSizes(file, parent, filename, imageSizes)
    // 	}
    // 	return ConvertType.MF2Item( await MediaFile.findOne({
    // 		where: {id: parent.id}
    // 	}));
    // }
    // public async ____getChildren(id: string): Promise<MediaManagerItem[]> {
    // 	return [];
    // 	return (await MediaFile.findOne({
    // 		where: {id: id}
    // 	}).populate('children', {sort: 'createdAt DESC'})).children
    // }
    // public async ____getMeta(id: string): Promise<{ key: string, value: string }[]> {
    // 	return []
    // 	return (await MediaFile.findOne(id).populate('meta')).meta
    // }
    // protected async ___resizeImage(input: string, output: string, width: number, height: number) {
    // 	return await sharp(input)
    // 		.resize({width: width, height: height})
    // 		.toFile(output)
    // }
    async delete(id) {
        await MediaFile.destroy({ where: { id: id } }).fetch();
    }
}
exports.ImageItem = ImageItem;
