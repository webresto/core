// todo: fix types model instance to {%ModelName%}Record for SelectedMediaFile";
import {AbstractMediaManager, MediaManagerItem, File, MediaManagerWidgetItem, MediaManagerWidgetJSON, MediaManagerWidgetData, MediaManagerWidgetClientItem, SortCriteria} from "adminizer";
import {ImageItem} from "./Items";
import { ConvertType } from "./helpers/ConvertType";

export class ProductMediaManager extends AbstractMediaManager {
	getItemsList(items: MediaManagerWidgetItem[]): Promise<MediaManagerWidgetClientItem[]> {
		throw new Error("Method not implemented.");
	}
	id: string = 'product';
	
	constructor() {
		super(sails.hooks.adminpanel.adminizer);
		// Set the fileStoragePath and urlPathPrefix for the AbstractMediaManager
		this.fileStoragePath = '.tmp/public';
		this.urlPathPrefix = 'image';
		// Use relative path as adminizer's mediaManagerAdapter will combine it with process.cwd()
		this.itemTypes.push(new ImageItem(this.urlPathPrefix, this.fileStoragePath));
	}
	
	public async setRelations(
		data: [MediaManagerWidgetData], 
		model: string, 
		modelId: string | number, 
		widgetName: string
	): Promise<void> {
		sails.log.silly(`Starting setRelations for model: ${model}, modelId: ${modelId}, widgetName: ${widgetName}`);
	
		// Debugging initial destruction query
		let destroy: Record<string, string | number> = {};
		destroy[model] = modelId;
		sails.log.silly(`Destroying selected media files with criteria:`, destroy);
		await SelectedMediaFile.destroy(destroy).fetch();
	
		// Debugging loop over data.list
		for (const [key, widgetItem] of data.entries()) {
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

	public async getRelations(model: string, widgetName: string, modelId: string | number): Promise<MediaManagerWidgetClientItem[]> {
		const widgetItems: MediaManagerWidgetClientItem[] = []
		const selectedFiles = await SelectedMediaFile.find({ [model]: modelId }).sort('sortOrder ASC');
		for (const selected of selectedFiles) {
			const mediaFileId = (selected as any)[`mediafile_${model}`];
			let file = await MediaFile.findOne({ id: mediaFileId });
			if (file) {
				const widgetItem: MediaManagerWidgetClientItem = {
					mimeType: `${file.type}/xxx`,
					variants: null,
					id: file.id
				}
				widgetItems.push(widgetItem);
			}
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
	
		// Total number of records
		let totalRecords: number = await MediaFile.count({
			where: {}
		})
	
		// If fewer records are loaded than there are in total, then next = true
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
