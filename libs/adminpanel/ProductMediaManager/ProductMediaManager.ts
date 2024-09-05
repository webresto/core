import {AbstractMediaManager, Item, File, WidgetItem, Data, widgetJSON} from "./AbstractMediaManager";
import {ApplicationItem, ImageItem, TextItem, VideoItem} from "./Items";

export class DefaultMediaManager extends AbstractMediaManager {
	public readonly itemTypes: File<Item>[] = [];

	constructor(id: string, path: string, dir: string, model: string, metaModel: string, modelAssoc: string) {
		super(id, path, dir, model, modelAssoc);
		this.itemTypes.push(new ImageItem(path, dir, model, metaModel))
		this.itemTypes.push(new TextItem(path, dir, model, metaModel))
		this.itemTypes.push(new ApplicationItem(path, dir, model, metaModel))
		this.itemTypes.push(new VideoItem(path, dir, model, metaModel))
	}

	public async getAll(limit: number, skip: number, sort: string): Promise<{ data: Item[], next: boolean }> {
		let data: Item[] = await sails.models[this.model].find({
			where: {parent: null},
			limit: limit,
			skip: skip,
			sort: sort//@ts-ignore
		}).populate('children', {sort: sort})

		let next: number = (await sails.models[this.model].find({
			where: {parent: null},
			limit: limit,
			skip: skip === 0 ? limit : skip + limit,
			sort: sort
		})).length

		return {
			data: data,
			next: !!next
		}
	}

	public async searchAll(s: string): Promise<Item[]> {
		return await sails.models[this.model].find({
			where: {filename: {contains: s}, parent: null},
			sort: 'createdAt DESC'
		}).populate('children', {sort: 'createdAt DESC'})
	}

	public async saveRelations(data: Data, model: string, modelId: string, modelAttribute: string): Promise<void> {
		let widgetItems: WidgetItem[] = []
		for (const [key, widgetItem] of data.list.entries()) {
			let record = await sails.models[this.modelAssoc].create({
				mediaManagerId: this.id,
				model: model,
				modelId: modelId,
				file: widgetItem.id,
				sortOrder: key + 1,
			}).fetch()
			widgetItems.push({
				id: record.id as string,
			})
		}

		let updateData: { [key: string]: widgetJSON } = {}

		updateData[modelAttribute] = {list: widgetItems, mediaManagerId: this.id}

		await sails.models[model].update({id: modelId}, updateData)
	}

	public async getRelations(items: WidgetItem[]): Promise<WidgetItem[]> {
		interface widgetItemVUE extends WidgetItem {
			children: Item[]
		}
		let widgetItems: widgetItemVUE[] = []
		for (const item of items) {
			let record = (await sails.models[this.modelAssoc].find({where: {id: item.id}}))[0]
			let file = (await sails.models[this.model].find({where: {id: record.file}}).populate('children', {sort: 'createdAt DESC'}))[0] as Item
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
		let modelAssociations = await sails.models[this.modelAssoc].find({where: {modelId: modelId, model: model}})
		for (const modelAssociation of modelAssociations) {
			await sails.models[this.modelAssoc].destroy(modelAssociation.id).fetch()
		}
	}
}
