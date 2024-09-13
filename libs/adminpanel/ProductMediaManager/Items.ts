import {File, Item, MediaFileType, UploaderFile, imageSizes} from 'sails-adminpanel/lib/media-manager/AbstractMediaManager'
import {randomFileName} from "sails-adminpanel/lib/media-manager/helpers/MediaManagerHelper";
import sizeOf from "image-size";
import sharp from "sharp";
// todo: fix types model instance to {%ModelName%}Record for MediaFile';

interface Meta {
	[key: string]: string
}

export class ImageItem extends File<Item> {
	public type: MediaFileType = "image";
	
	constructor(path: string, dir: string, model: string, metaModel: string) {
		super(path, dir, null, null);
	}

	private MF2Item(mf: MediaFileRecord): Item  
	private MF2Item(mf: MediaFileRecord[]): Item[]
	private MF2Item(mf: MediaFileRecord | MediaFileRecord[]): Item | Item[] {
		let processItem = (mfItem: MediaFileRecord): Item => {
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
		} else {
			return processItem(mf);
		}
	}

	private Item2MF(item: Partial<Item>): MediaFileRecord  
	private Item2MF(items: Partial<Item>[]): MediaFileRecord[]
	private Item2MF(itemOrItems: Partial<Item> | Partial<Item>[]): MediaFileRecord | MediaFileRecord[] {
		let processItem = (item: Partial<Item>): MediaFileRecord => {
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
		} else {
			return processItem(itemOrItems);
		}
	}

	public async getItems(limit: number, skip: number, sort: string): Promise<{ data: Item[]; next: boolean }> {
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
			data: this.MF2Item(mediaFiles),
			next: !!next
		}
	}

	public async search(s: string): Promise<Item[]>{
		return [];
		// return await MediaFile.find({
		// 	where: {filename: {contains: s}, mimeType: { contains: this.type}, parent: null},
		// 	sort: 'createdAt DESC'
		// }).populate('children', {sort: 'createdAt DESC'})
	}

	public async upload(file: UploaderFile, filename: string, origFileName: string, imageSizes?: imageSizes | {}): Promise<Item> {

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
			await this.createSizes(file, parent, filename, imageSizes)
		}

		return this.MF2Item( await MediaFile.findOne({
			where: {id: parent.id}
		}));
	}

	public async getChildren(id: string): Promise<Item[]> {
		return [];
		return (await MediaFile.findOne({
			where: {id: id}
		}).populate('children', {sort: 'createdAt DESC'})).children
	}

	protected async createSizes(file: UploaderFile, parent: Item, filename: string, imageSizes: imageSizes): Promise<void> {
		console.log("SIZES")
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

	protected async createThumb(id: string, file: UploaderFile, filename: string, origFileName: string): Promise<void> {
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

	protected async createEmptyMeta(id: string) {
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

	public async getMeta(id: string): Promise<{ key: string, value: string }[]> {
		return []
		return (await MediaFile.findOne(id).populate('meta')).meta
	}

	async setMeta(id: string, data: { [p: string]: string }): Promise<{ msg: "success" }> {
		// for (const key of Object.keys(data)) {
		// 	await sails.models[this.metaModel].update({parent: id, key: key}, {value: data[key]})
		// }
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
		return null
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

	async delete(id: string): Promise<void> {
		await MediaFile.destroy({where: {id: id}}).fetch()
	}
}