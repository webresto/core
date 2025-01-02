import {File, MediaManagerItem, MediaFileType, UploaderFile} from 'sails-adminpanel/lib/media-manager/AbstractMediaManager'
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
		const mfAdater = await Adapter.getMediaFileAdapter();
		const mediaFile = await mfAdater.toProcess(`file://${file.fd}`, "dish", "image");	
		let parent: MediaManagerItem = ConvertType.MF2Item(mediaFile);
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

    public async getOrigin(id: string): Promise<string> {
		const mf = await MediaFile.findOne({ where: { id: id }})
		if(!mf){
            throw `get origin fail with id: ${id}`
        }

        return path.resolve(process.cwd(), mf.originalFilePath || mf.original || '');
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