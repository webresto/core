import {AbstractCatalog, AbstractGroup, AbstractItem, ActionHandler, Item} from "sails-adminpanel/lib/catalog/AbstractCatalog";


class BaseModelItem<T extends Item> extends AbstractItem<T> {
	public type: string = "product";
	public name: string = "Product";
	public allowedRoot: boolean = true;
	public icon: string = "bread-slice";
	public model: string = null;

	public readonly actionHandlers: any[] = []

	public async find(itemId: string | number) {
		return await sails.models[this.model].findOne({id: itemId});
	}

	public async update(itemId: string | number, data: Item): Promise<T> {
		// allowed only parentId update
		return await sails.models[this.model].update({id: itemId}, {name: data.name, parentId: data.parentId}).fetch();
	};
	// @ts-ignore
	create(catalogId: string, data: T): Promise<T> {
		return Promise.resolve(undefined);
	}

	// public async create(itemId: string, data: Item): Promise<Item> {
	// 	throw `I dont know for what need it`
	// 	// return await sails.models.create({ name: data.name, parentId: data.parentId}).fetch();
	// 	// return await StorageService.setElement(itemId, data);
	// }

	public async deleteItem(itemId: string | number) {
		await sails.models[this.model].destroy({id: itemId})
		//	await StorageService.removeElementById(itemId);
	}

	public getAddHTML(): Promise<{ type: "link" | "html"; data: string; }> {
		let type: 'link' = 'link'
		return Promise.resolve({
			type: type,
			data: `/admin/model/${this.model}/add?without_layout=true`
		})
	}


	public async getEditHTML(id: string | number, parenId?: string | number): Promise<{
		type: "link" | "html";
		data: string;
	}> {
		let type: 'link' = 'link'
		return {
			type: type,
			data: `/admin/model/${this.model}/edit/${id}?without_layout=true`
		}
	}

	// TODO: Need rename (getChilds) it not intuitive
	public async getChilds(parentId: string | number): Promise<Item[]> {
		// console.log(this.type, parentId, await sails.models[this.model].find({parentId: parentId}))
		return await sails.models[this.model].find({parentId: parentId});
	}

	public async search(s: string): Promise<T[]> {
		return await sails.models[this.model].find({name: {contains: s}});
	}

	updateModelItems(itemId: string | number, data: T, catalogId: string): Promise<T> {
		return Promise.resolve(undefined);
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

}

export class ProductCatalog extends AbstractCatalog {
	public readonly name: string = "Product catalog";
	public readonly slug: string = "productCatalog";
	public readonly maxNestingDepth: number = null;
	public readonly icon: string = "barcode";
	public readonly actionHandlers: any[] = []

	constructor() {
		super([
			new Group(),
			new Product()
		]);
	}
}