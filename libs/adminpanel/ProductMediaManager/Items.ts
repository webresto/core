import {File, MediaManagerItem, MediaFileType, UploaderFile, imageSizes} from 'sails-adminpanel/lib/media-manager/AbstractMediaManager'
import {randomFileName} from "sails-adminpanel/lib/media-manager/helpers/MediaManagerHelper";
import sizeOf from "image-size";
import sharp from "sharp"
import { MediaFileRecord } from '../../../models/MediaFile';
import { ConvertType } from './helpers/ConvertType';
// todo: fix types model instance to {%ModelName%}Record for MediaFile';
const fs = require('fs').promises;
const path = require('path');


export class ImageItem extends File<MediaManagerItem> {

	public getMeta(id: string): Promise<{ key: string; value: string; }[]> {
		throw new Error('Method not implemented.');
	}
	public type: MediaFileType = "image";
	public async upload(file: UploaderFile, filename: string, origFileName: string, group?: string): Promise<MediaManagerItem[]> {
		const destinationPath = path.join(this.dir, filename);
		// Check if the file exists at the given fd path
		try {
			await fs.access(file.fd);
		} catch (error) {
			sails.log.error(`File not found at path: ${file.fd}`);
			throw new Error(`File not found: ${file.fd}`);
		}
		console.log(">>>>", destinationPath);

		// Ensure the destination directory exists
		const destinationDir = path.dirname(destinationPath);
		try {
			await fs.mkdir(destinationDir, { recursive: true });
		} catch (error) {
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
	
		let parent: MediaManagerItem = ConvertType.MF2Item(await MediaFile.create(ConvertType.Item2MF({
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
	

	public setMeta(id: string, data: { [key: string]: string; }): Promise<void> {
		throw new Error('Method not implemented.');
	}
	public getVariants(id: string): Promise<MediaManagerItem[]> {
		throw new Error('Method not implemented.');
	}
	public uploadVariant(item: MediaManagerItem, file: UploaderFile, fileName: string, group?: string, localeId?: string): Promise<MediaManagerItem> {
		throw new Error('Method not implemented.');
	}

    public async getOrirgin(id: string): Promise<string> {
        return path.join(process.cwd(), (await MediaFile.findOne({ where: { id: id }, })).originalFilePath);
    }

	public async getItems(limit: number, skip: number, sort: string): Promise<{ data: MediaManagerItem[]; next: boolean }> {
		let mediaFiles = await MediaFile.find({
			where: {type: this.type as "image"},
			limit: limit,
			skip: skip,
			sort: sort//@ts-ignore
		}).populate('children', {sort: sort})

		let next: number = (await MediaFile.count({
			where: {type: this.type as "image"},
			limit: limit,
			skip: skip === 0 ? limit : skip + limit,
			sort: sort
		}))

		return {
			data: ConvertType.MF2Item(mediaFiles),
			next: !!next
		}
	}

	public async search(s: string): Promise<MediaManagerItem[]>{
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



	async delete(id: string): Promise<void> {
		await MediaFile.destroy({where: {id: id}}).fetch()
	}
}