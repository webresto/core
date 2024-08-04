"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductCatalog = exports.Product = exports.Group = void 0;
const AbstractCatalog_1 = require("sails-adminpanel/lib/catalog/AbstractCatalog");
class BaseModelItem extends AbstractCatalog_1.AbstractItem {
    constructor() {
        super(...arguments);
        this.type = "product";
        this.name = "Product";
        this.allowedRoot = true;
        this.icon = "bread-slice";
        this.model = null;
        this.actionHandlers = [];
    }
    async find(itemId) {
        return await sails.models[this.model].findOne({ id: itemId });
    }
    async update(itemId, data) {
        // allowed only parentId update
        return await sails.models[this.model].update({ id: itemId }, { name: data.name, parentId: data.parentId }).fetch();
    }
    ;
    // @ts-ignore
    create(catalogId, data) {
        return Promise.resolve(undefined);
    }
    // public async create(itemId: string, data: Item): Promise<Item> {
    // 	throw `I dont know for what need it`
    // 	// return await sails.models.create({ name: data.name, parentId: data.parentId}).fetch();
    // 	// return await StorageService.setElement(itemId, data);
    // }
    async deleteItem(itemId) {
        await sails.models[this.model].destroy({ id: itemId });
        //	await StorageService.removeElementById(itemId);
    }
    getAddHTML() {
        let type = 'link';
        return Promise.resolve({
            type: type,
            data: `/admin/model/${this.model}/add?without_layout=true`
        });
    }
    async getEditHTML(id, parenId) {
        let type = 'link';
        return {
            type: type,
            data: `/admin/model/${this.model}/edit/${id}?without_layout=true`
        };
    }
    // TODO: Need rename (getChilds) it not intuitive
    async getChilds(parentId) {
        // console.log(this.type, parentId, await sails.models[this.model].find({parentId: parentId}))
        return await sails.models[this.model].find({ parentId: parentId });
    }
    async search(s) {
        return await sails.models[this.model].find({ name: { contains: s } });
    }
    updateModelItems(itemId, data, catalogId) {
        return Promise.resolve(undefined);
    }
}
class Group extends BaseModelItem {
    constructor() {
        super(...arguments);
        this.name = "Group";
        this.allowedRoot = true;
        this.icon = 'folder';
        this.type = 'group';
        this.isGroup = true;
        this.model = "group";
        this.actionHandlers = [];
    }
}
exports.Group = Group;
class Product extends BaseModelItem {
    constructor() {
        super(...arguments);
        this.name = "Product";
        this.allowedRoot = true;
        this.icon = 'file';
        this.type = 'product';
        this.model = "dish";
        this.actionHandlers = [];
    }
}
exports.Product = Product;
class ProductCatalog extends AbstractCatalog_1.AbstractCatalog {
    constructor() {
        super([
            new Group(),
            new Product()
        ]);
        this.name = "Product catalog";
        this.slug = "productCatalog";
        this.maxNestingDepth = null;
        this.icon = "barcode";
        this.actionHandlers = [];
    }
}
exports.ProductCatalog = ProductCatalog;
