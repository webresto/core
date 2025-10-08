import {AbstractCatalog, AbstractGroup, AbstractItem, ActionHandler, Adminizer, Item} from "adminizer";

interface ItemModel {
	id: string
	name: string
	parentGroup: string
	concept: string
	sortOrder: number
}

class BaseModelItem<T extends Item> extends AbstractItem<T> {
	adminizer: Adminizer;
	//@ts-ignore
	getAddTemplate(req: ReqType): Promise<{ type: "component" | "navigation.group" | "navigation.link" | "model"; data: any; }> {
		throw new Error("must be inherited");
	}
	getEditTemplate(id: string | number, catalogId: string, req: ReqType, modelId?: string | number): Promise<{ type: "component" | "navigation.group" | "navigation.link" | "model"; data: any; }> {
		throw new Error("must be inherited");
	}
	public updateModelItems(modelId: string | number, data: any, catalogId: string): Promise<T> {
		throw new Error("must be inherited");
	}
	
	public type: string = "product";
	public name: string = "Product";
	public allowedRoot: boolean = true;
	public icon: string = "bread-slice";
	public model: string = null;

	public readonly actionHandlers: any[] = []

	private toItem(data: ItemModel): Item {
		return {
			id: data.id,
			name: data.name,
			parentId: data.parentGroup,
			sortOrder: data.sortOrder,
			icon: this.icon,
			type: this.type,
			// childs: [],
			// marked: false
		}
	}

	public async find(itemId: string | number, catalogId: string): Promise<T> {
		const item = await sails.models[this.model].findOne({ id: itemId, concept: catalogId });
		return this.toItem(item) as T;
	}

	public async update(itemId: string | number, data: Item, catalogId: string): Promise<T> {
		// Perform the update, returning the first updated item
		const updatedRecords = await sails.models[this.model].update(
			{ id: itemId, concept: catalogId },
			{ name: data.name, parentGroup: data.parentId, sortOrder: data.sortOrder }
		).fetch();
	
		// Ensure we return the first updated record, cast to type T
		const updatedItem = updatedRecords[0];
		return this.toItem(updatedItem) as T;
	}
	

	public async create(data: T, catalogId: string): Promise<T> {
		//@ts-ignore
		data.parentGroup = data.parentId
		let result = await sails.models[this.model].create(data).fetch()
		return this.toItem(result) as T;
	}

	public async deleteItem(itemId: string | number, catalogId: string) {
		await sails.models[this.model].update({ id: itemId, concept: catalogId }, { isDeleted: true }).fetch();
	
		if (this.model === 'group') {
			const dishesToUpdate = await sails.models.dish.find({ parentGroup: itemId, concept: catalogId });	
			if (dishesToUpdate.length > 0) {
				await sails.models.dish.update({ id: dishesToUpdate.map((dish: { id: string; }) => dish.id) }, { isDeleted: true }).fetch();
			}
		}
	}
	


	public async getChilds(parentId: string, catalogId: string): Promise<Item[]> {
		const records = await sails.models[this.model].find({
			parentGroup: parentId == "0" ? null : parentId,
			concept: catalogId,
			isDeleted: false
		});
		console.log(this.model, records.length)
		return records.map((record: ItemModel) => this.toItem(record));
	}

	public async search(s: string, catalogId: string): Promise<T[]> {
		const records = await sails.models[this.model].find({
			name: { contains: s },
			concept: catalogId
		});

		return records.map((record: ItemModel) => this.toItem(record) as T);
	}
}


export class Group<GroupProductItem extends Item> extends BaseModelItem<GroupProductItem> {
	public name: string = "Group";
	public allowedRoot: boolean = true;
	public icon = 'folder'
	public type = 'group'
	public isGroup: boolean = true;
	public model: string = "group";
	public readonly actionHandlers: any[] = []

	async getAddTemplate(req: any): Promise<any> {
		return {
		type: 'model',
		data: {
			model: this.model,
			labels: {
				title: req.i18n.__('Add Group'),
				save: req.i18n.__('Save'),
			},
		},
		};
	}

	async getEditTemplate(id: string | number, catalogId: string, req: any): Promise<any> {
		const item = await this.find(id);
		return {
		type: 'model',
		data: {
			item: {
				modelId: item.id
			},
			model: this.model,
			labels: {
				title: req.i18n.__('Edit Group'),
				save: req.i18n.__('Save'),
			},
		},
		};
	}
}

export class Product<T extends Item> extends BaseModelItem<T> {
	public name: string = "Product";
	public allowedRoot: boolean = true;
	public icon = 'summarize'
	public type = 'product'
	public model: string = "dish";
	public readonly actionHandlers: any[] = []
	public concept:  string = "origin";
	
	public async getAddTemplate(req: ReqType): Promise<{ type: "component" | "navigation.group" | "navigation.link" | "model"; data: any; }> {
		let type: 'model' = 'model'
		let itemsDB = await sails.models[this.model].find({})
		return {
			type: type,
			data: {
				model: this.model,
				labels: {
					title: req.i18n.__('Add Product'),
					save: req.i18n.__('Save'),
				}
			}
		}
	}

	public async getEditTemplate(id: string | number, catalogId: string, req: ReqType, modelId?: string | number): Promise<{ type: "component" | "navigation.group" | "navigation.link" | "model"; data: any; }> {
		console.log("Product getEditTemplate", id, catalogId);
		const item = await this.find(id, catalogId) 
		return Promise.resolve({
			type: 'model',
			data: {
				model: this.model,
				item:  {
					modelId: item.id
				},
				labels: {
					title: req.i18n.__('Add Product'),
					save: req.i18n.__('Save'),
				}
			}
		})
	}
}

export class ProductCatalog extends AbstractCatalog {
	public readonly name: string = "Product catalog";
	public readonly slug: string = "products";
	public readonly maxNestingDepth: number = null;
	public readonly icon: string = "barcode";
	public readonly actionHandlers: any[] = []

	constructor() {
		super(sails.hooks.adminpanel.adminizer, [
			new Group(),
			new Product()
		]);
	}

	public async getIdList(): Promise<string[]> {
		const groups = await sails.models['group'].find({});
		const concepts: string[] = groups.map((group: { concept: string; }) => group.concept);
		concepts.push('origin')
		return [...new Set(concepts)];
	}
}