// todo: fix types model instance to {%ModelName%}Record for SelectedMediaFile";
import {AbstractMediaManager, MediaManagerItem, File, MediaManagerWidgetItem, MediaManagerWidgetJSON, MediaManagerWidgetData, MediaManagerWidgetClientItem, SortCriteria} from "sails-adminpanel/lib/media-manager/AbstractMediaManager";
import {ImageItem} from "./Items";
import { ConvertType } from "./helpers/ConvertType";

export class ProductMediaManager extends AbstractMediaManager {
	id: string = 'product';
	
	constructor() {
		super();
		this.itemTypes.push(new ImageItem('/image', process.cwd()+"/.tmp/public/image"));
		console.log(this.itemTypes)
	}
	
	public async setRelations(
		data: MediaManagerWidgetData, 
		model: string, 
		modelId: string, 
		widgetName: string
	): Promise<void> {
		sails.log.silly(`Starting setRelations for model: ${model}, modelId: ${modelId}, widgetName: ${widgetName}`);
	
		// Debugging initial destruction query
		let destroy: Record<string, string | number> = {};
		destroy[model] = modelId;
		sails.log.silly(`Destroying selected media files with criteria:`, destroy);
		await SelectedMediaFile.destroy(destroy).fetch();
	
		// Debugging loop over data.list
		for (const [key, widgetItem] of data.list.entries()) {
			let init: Record<string, string | number> = {};
			init[`mediafile_${model}`] = widgetItem.id;
			init[model] = modelId;
			init["sortOrder"] = key + 1;
			if(model && modelId){
				sails.log.silly(`Creating selected media file with data:`, init);
				await SelectedMediaFile.create(init).fetch();		
			}
		}
	
		sails.log.debug(`Completed setRelations for model: ${model}, modelId: ${modelId}, widgetName: ${widgetName}`);
	}

	public async getRelations(items: MediaManagerWidgetItem[]): Promise<MediaManagerWidgetClientItem[]> {
		const widgetItems: MediaManagerWidgetClientItem[] = []
		for (const item of items) {
			let file = await MediaFile.findOne({id: item.id});
			const widgetItem: MediaManagerWidgetClientItem = {
				mimeType: `${file.type}/xxx`,
				variants: null,
				id: file.id
			}
			widgetItems.push(widgetItem);
		}
		return widgetItems
	}
	
	public async getAll(limit: number, skip: number, sort: SortCriteria, group?: string): Promise<{ data: MediaManagerItem[]; next: boolean; }> {
		let data: MediaManagerItem[] = ConvertType.MF2Item(
			await MediaFile.find({
				where: {},
				limit: limit,
				skip: skip,
				sort: sort
			})		
		) 
	
		// Общее количество записей
		let totalRecords: number = await MediaFile.count({
			where: {}
		})
	
		// Если загружено меньше записей, чем есть всего, то next = true
		let next: boolean = (skip + limit) < totalRecords;
	
		return {
			data: data,
			next: next
		}
	}
	

	public async searchAll(s: string): Promise<MediaManagerItem[]> {
		throw `Not implemented by allowSearch`
	}
}
