import {File, Item, UploaderFile, imageSizes} from 'sails-adminpanel/lib/media-manager/AbstractMediaManager'
import {randomFileName} from "sails-adminpanel/lib/media-manager/helpers/MediaManagerHelper";
import sizeOf from "image-size";
import sharp from "sharp";

interface Meta {
	[key: string]: string
}

export class ImageItem extends File<Item> {
	public type: "application" | "audio" | "example" | "image" | "message" | "model" | "multipart" | "text" | "video" = "image";

	constructor(path: string, dir: string, model: string, metaModel: string) {
		super(path, dir, model, metaModel);
	}

	public async getItems(limit: number, skip: number, sort: string): Promise<{ data: Item[]; next: boolean }> {
		let data: Item[] = await sails.models[this.model].find({
			where: {parent: null, mimeType: { contains: this.type}},
			limit: limit,
			skip: skip,
			sort: sort//@ts-ignore
		}).populate('children', {sort: sort})

		let next: number = (await sails.models[this.model].find({
			where: {parent: null, mimeType: { contains: this.type}},
			limit: limit,
			skip: skip === 0 ? limit : skip + limit,
			sort: sort
		})).length

		return {
			data: data,
			next: !!next
		}
	}

	public async search(s: string): Promise<Item[]>{
		return await sails.models[this.model].find({
			where: {filename: {contains: s}, mimeType: { contains: this.type}, parent: null},
			sort: 'createdAt DESC'
		}).populate('children', {sort: 'createdAt DESC'})
	}

	public async upload(file: UploaderFile, filename: string, origFileName: string, imageSizes?: imageSizes | {}): Promise<Item> {

		let parent: Item = await sails.models[this.model].create({
			parent: null,
			mimeType: file.type,
			size: file.size,
			path: file.fd,
			cropType: 'origin',
			filename: origFileName,
			image_size: sizeOf(file.fd),
			url: `/${this.path}/${filename}`
		}).fetch();

		await this.createEmptyMeta(parent.id)

		if (parent.image_size.width > 150 && parent.image_size.height > 150) {
			await this.createThumb(parent.id, file, filename, origFileName)
		}

		if (Object.keys(imageSizes).length) {
			await this.createSizes(file, parent, filename, imageSizes)
		}

		return sails.models[this.model].find({
			where: {id: parent.id}
		}).populate('children') as Item;
	}

	public async getChildren(id: string): Promise<Item[]> {
		return (await sails.models[this.model].findOne({
			where: {id: id}
		}).populate('children', {sort: 'createdAt DESC'})).children
	}

	protected async createSizes(file: UploaderFile, parent: Item, filename: string, imageSizes: imageSizes): Promise<void> {
		for (const sizeKey of Object.keys(imageSizes)) {
			let sizeName = randomFileName(filename, sizeKey, false)

			let {width, height} = imageSizes[sizeKey]

			if (parent.image_size.width < width || parent.image_size.height < height) continue

			let newFile = await this.resizeImage(file.fd, `${this.dir}${sizeName}`, width, height)
			await sails.models[this.model].create({
				parent: parent.id,
				mimeType: parent.mimeType,
				size: newFile.size,
				filename: parent.filename,
				path: `${this.dir}${sizeName}`,
				cropType: sizeKey,
				image_size: sizeOf(`${this.dir}${sizeName}`),
				url: `/${this.path}/${sizeName}`
			})
		}
	}

	protected async createThumb(id: string, file: UploaderFile, filename: string, origFileName: string): Promise<void> {
		const thumbName = randomFileName(filename, 'thumb', false)
		const thumb = await this.resizeImage(file.fd, `${this.dir}${thumbName}`, 150, 150)

		await sails.models[this.model].create({
			parent: id,
			mimeType: file.type,
			size: thumb.size,
			cropType: 'thumb',
			path: `${this.dir}${thumbName}`,
			filename: origFileName,
			image_size: sizeOf(`${this.dir}${thumbName}`),
			url: `/${this.path}/${thumbName}`
		})
	}

	protected async createEmptyMeta(id: string) {
		//create empty meta
		let metaData: Meta = {
			author: "",
			description: "",
			title: ""
		}

		for (const key of Object.keys(metaData)) {
			await sails.models[this.metaModel].create({
				key: key,
				value: metaData[key],
				parent: id
			})
		}
	}

	public async getMeta(id: string): Promise<{ key: string, value: string }[]> {
		return (await sails.models[this.model].findOne(id).populate('meta')).meta
	}

	async setMeta(id: string, data: { [p: string]: string }): Promise<{ msg: "success" }> {
		for (const key of Object.keys(data)) {
			await sails.models[this.metaModel].update({parent: id, key: key}, {value: data[key]})
		}
		return {msg: "success"}
	}

	protected async resizeImage(input: string, output: string, width: number, height: number) {
		return await sharp(input)
			.resize({width: width, height: height})
			.toFile(output)
	}

	public async uploadCropped(parent: Item, file: UploaderFile, filename: string, config: {
		width: number,
		height: number
	}): Promise<Item> {
		return await sails.models[this.model].create({
			parent: parent.id,
			mimeType: file.type,
			size: file.size,
			path: file.fd,
			cropType: `${config.width}x${config.height}`,
			filename: parent.filename,
			image_size: sizeOf(file.fd),
			url: `/${this.path}/${filename}`
		}).fetch()
	}

	async delete(id: string): Promise<void> {
		await sails.models[this.model].destroy({where: {id: id}}).fetch()
	}
}