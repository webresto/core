// todo: fix types model instance to {%ModelName%}Record for SelectedMediaFile";
import {AbstractMediaManager, Item, File, MediaManagerWidgetItem, Data, MediaManagerWidgetJSON} from "sails-adminpanel/lib/media-manager/AbstractMediaManager";
import {ImageItem} from "./Items";

export class DefaultMediaManager extends AbstractMediaManager {
	public readonly itemTypes: File<Item>[] = [];

	constructor(id: string, path: string, dir: string, model: string, metaModel: string, modelAssoc: string) {
		super(id, path, dir, model, modelAssoc);
		this.itemTypes.push(new ImageItem(path, dir, model, metaModel))
	}

	public async getAll(limit: number, skip: number, sort: string): Promise<{ data: Item[], next: boolean }> {
		let data: Item[] = await MediaFile.find({
			where: {},
			limit: limit,
			skip: skip,
			sort: sort//@ts-ignore
		}).populate('children', {sort: sort})

		let next: number = await MediaFile.count({
			where: {},
			limit: limit,
			skip: skip === 0 ? limit : skip + limit,
			sort: sort
		})

		return {
			data: data,
			next: !!next
		}
	}

	public async searchAll(s: string): Promise<Item[]> {
		return []
		// return await MediaFile.find({
		// 	where: {filename: {contains: s}, parent: null},
		// 	sort: 'createdAt DESC'
		// }).populate('children', {sort: 'createdAt DESC'})
	}

	public async saveRelations(data: Data, model: string, modelId: string, modelAttribute: string): Promise<void> {
		let widgetItems: MediaManagerWidgetItem[] = []
		for (const [key, widgetItem] of data.list.entries()) {
			let init: Record<string, string | number> = {}
			init[`mediafile_${model}`] = widgetItem.id
			init[model] = modelId
			init["sortOrder"] = key + 1
			let record = await SelectedMediaFile.create(init).fetch()
			// widgetItems.push({
			// 	id: record.id as string,
			// })
		}

		// let updateData: { [key: string]: MediaManagerWidgetJSON } = {}

		// updateData[modelAttribute] = {list: widgetItems, mediaManagerId: this.id}

		// await MediaFile.update({id: modelId}, updateData)
	}

	public async getRelations(items: MediaManagerWidgetItem[]): Promise<MediaManagerWidgetItem[]> {
		interface widgetItemVUE extends MediaManagerWidgetItem {
			children: Item[]
		}
		let widgetItems: widgetItemVUE[] = []
		for (const item of items) {
			let record = (await SelectedMediaFile.find({where: {id: item.id}}))[0]
			let file = (await MediaFile.find({where: {id: record.file}}).populate('children', {sort: 'createdAt DESC'}))[0] as Item
			widgetItems.push({
				id: file.id,
				children: file.children,
			})
		}
		return widgetItems
	}

	public async updateRelations(data: Data, model: string, modelId: string, modelAttribute: string): Promise<void>{
		await  this.deleteRelations(model, modelId)
		await this.saveRelations(data, model, modelId, modelAttribute)
	}

	public async deleteRelations(model: string, modelId: string): Promise<void>{
		let modelAssociations = await SelectedMediaFile.find({where: {modelId: modelId, model: model}})
		for (const modelAssociation of modelAssociations) {
			await SelectedMediaFile.destroy(modelAssociation.id).fetch()
		}
	}
}
