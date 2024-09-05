import {AbstractCatalog, AbstractGroup, AbstractItem, ActionHandler, Item} from "sails-adminpanel/lib/catalog/AbstractCatalog";

interface ItemModel {
	id: string
	name: string
	parentGroup: string
	concept: string
	sortOrder: number
}

class BaseModelItem<T extends Item> extends AbstractItem<T> {
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
			icon: "",
			type: ""
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
		return ;
	}

	public async deleteItem(itemId: string | number, catalogId: string) {
		await sails.models[this.model].update({id: itemId, concept: catalogId}, {isDeleted: true}).fetch()
	}

	public getAddHTML(): Promise<{ type: "link" | "html"; data: string; }> {
		let type: 'link' = 'link'
		let linkMap = this.model === 'dish' ? 'product' : this.model
		return Promise.resolve({
			type: type,
			data: `/admin/model/${linkMap}s/add?without_layout=true`
		})
	}


	public async getEditHTML(id: string | number, parenId?: string | number): Promise<{
		type: "link" | "html";
		data: string;
	}> {
		let type: 'link' = 'link'
		let linkMap = this.model === 'dish' ? 'product' : this.model
		return {
			type: type,
			data: `/admin/model/${linkMap}s/edit/${id}?without_layout=true`
		}
	}

	public async getChilds(parentId: string, catalogId: string): Promise<Item[]> {
		const records = await sails.models[this.model].find({
			parentGroup: parentId,
			concept: catalogId,
			isDeleted: false
		});
		
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
}

export class Product<T extends Item> extends BaseModelItem<T> {
	public name: string = "Product";
	public allowedRoot: boolean = true;
	public icon = 'file'
	public type = 'product'
	public model: string = "dish";
	public readonly actionHandlers: any[] = []
	public concept:  string = "origin";
	
}

export class ProductCatalog extends AbstractCatalog {
	public readonly name: string = "Product catalog";
	public readonly slug: string = "products";
	public readonly maxNestingDepth: number = null;
	public readonly icon: string = "barcode";
	public readonly actionHandlers: any[] = []

	constructor() {
		super([
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