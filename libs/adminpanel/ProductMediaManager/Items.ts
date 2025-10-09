import {File, MediaManagerItem, MediaFileType, UploaderFile} from 'adminizer'
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

        return (mf.originalFilePath || mf.original || '');
    }

	public async getItems(limit: number, skip: number, sort: string): Promise<{ data: MediaManagerItem[]; next: boolean }> {
		let mediaFiles = await MediaFile.find({
			where: {type: this.type as "image"},
			limit: limit,
			skip: skip,
			sort: sort//@ts-ignore
		})

		let totalCount: number = (await MediaFile.count({
			where: {type: this.type as "image"}
		}))
		
		let next: boolean = (skip + limit) < totalCount

		return {
			data: ConvertType.MF2Item(mediaFiles),
			next: next
		}
	}

	public async search(s: string): Promise<MediaManagerItem[]>{
		return [];
	}

	async delete(id: string): Promise<boolean> {
		const destroyed = await MediaFile.destroy({where: {id: id}}).fetch();
		return destroyed.length > 0;
	}
}