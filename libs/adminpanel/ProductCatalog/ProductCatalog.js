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
    toItem(data) {
        return {
            id: data.id,
            name: data.name,
            parentId: data.parentGroup,
            sortOrder: data.sortOrder,
            icon: "",
            type: ""
        };
    }
    async find(itemId, catalogId) {
        const item = await sails.models[this.model].findOne({ id: itemId, concept: catalogId });
        return this.toItem(item);
    }
    async update(itemId, data, catalogId) {
        // Perform the update, returning the first updated item
        const updatedRecords = await sails.models[this.model].update({ id: itemId, concept: catalogId }, { name: data.name, parentGroup: data.parentId, sortOrder: data.sortOrder }).fetch();
        // Ensure we return the first updated record, cast to type T
        const updatedItem = updatedRecords[0];
        return this.toItem(updatedItem);
    }
    async create(data, catalogId) {
        //@ts-ignore
        data.parentGroup = data.parentId;
        let result = await sails.models[this.model].create(data).fetch();
        return;
    }
    async deleteItem(itemId, catalogId) {
        await sails.models[this.model].update({ id: itemId, concept: catalogId }, { isDeleted: true }).fetch();
    }
    getAddHTML() {
        let type = 'link';
        let linkMap = this.model === 'dish' ? 'product' : this.model;
        return Promise.resolve({
            type: type,
            data: `/admin/model/${linkMap}s/add?without_layout=true`
        });
    }
    async getEditHTML(id, parenId) {
        let type = 'link';
        let linkMap = this.model === 'dish' ? 'product' : this.model;
        return {
            type: type,
            data: `/admin/model/${linkMap}s/edit/${id}?without_layout=true`
        };
    }
    async getChilds(parentId, catalogId) {
        const records = await sails.models[this.model].find({
            parentGroup: parentId,
            concept: catalogId,
            isDeleted: false
        });
        return records.map((record) => this.toItem(record));
    }
    async search(s, catalogId) {
        const records = await sails.models[this.model].find({
            name: { contains: s },
            concept: catalogId
        });
        return records.map((record) => this.toItem(record));
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
        this.concept = "origin";
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
        this.slug = "products";
        this.maxNestingDepth = null;
        this.icon = "barcode";
        this.actionHandlers = [];
    }
    async getIdList() {
        const groups = await sails.models['group'].find({});
        const concepts = groups.map((group) => group.concept);
        concepts.push('origin');
        return [...new Set(concepts)];
    }
}
exports.ProductCatalog = ProductCatalog;
