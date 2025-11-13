"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductCatalog = exports.Product = exports.Group = void 0;
const adminizer_1 = require("adminizer");
class BaseModelItem extends adminizer_1.AbstractItem {
    constructor() {
        super(...arguments);
        this.type = "product";
        this.name = "Product";
        this.allowedRoot = true;
        this.icon = "bread-slice";
        this.model = null;
        this.actionHandlers = [];
    }
    //@ts-ignore
    getAddTemplate(req) {
        throw new Error("must be inherited");
    }
    getEditTemplate(id, catalogId, req, modelId) {
        throw new Error("must be inherited");
    }
    updateModelItems(modelId, data, catalogId) {
        throw new Error("must be inherited");
    }
    toItem(data) {
        return {
            id: data.id,
            name: data.name,
            parentId: data.parentGroup,
            sortOrder: data.sortOrder,
            icon: this.icon,
            type: this.type,
            // childs: [],
            // marked: false
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
        return this.toItem(result);
    }
    async deleteItem(itemId, catalogId) {
        await sails.models[this.model].update({ id: itemId, concept: catalogId }, { isDeleted: true }).fetch();
        if (this.model === 'group') {
            const dishesToUpdate = await sails.models.dish.find({ parentGroup: itemId, concept: catalogId });
            if (dishesToUpdate.length > 0) {
                await sails.models.dish.update({ id: dishesToUpdate.map((dish) => dish.id) }, { isDeleted: true }).fetch();
            }
        }
    }
    async getChilds(parentId, catalogId) {
        const records = await sails.models[this.model].find({
            parentGroup: parentId == "0" ? null : parentId,
            concept: catalogId,
            isDeleted: false
        });
        console.log(this.model, records.length);
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
    async getAddTemplate(req) {
        return {
            type: 'model',
            data: {
                model: this.model,
                labels: {
                    //@ts-ignore
                    title: req.i18n.__('Add Group'),
                    //@ts-ignore
                    save: req.i18n.__('Save'),
                },
            },
        };
    }
    async getEditTemplate(id, catalogId, req) {
        const item = await this.find(id, catalogId);
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
exports.Group = Group;
class Product extends BaseModelItem {
    constructor() {
        super(...arguments);
        this.name = "Product";
        this.allowedRoot = true;
        this.icon = 'summarize';
        this.type = 'product';
        this.model = "dish";
        this.actionHandlers = [];
        this.concept = "origin";
    }
    async getAddTemplate(req) {
        let type = 'model';
        let itemsDB = await sails.models[this.model].find({});
        return {
            type: type,
            data: {
                model: this.model,
                labels: {
                    //@ts-ignore
                    title: req.i18n.__('Add Product'),
                    //@ts-ignore
                    save: req.i18n.__('Save'),
                }
            }
        };
    }
    async getEditTemplate(id, catalogId, req, modelId) {
        console.log("Product getEditTemplate", id, catalogId);
        const item = await this.find(id, catalogId);
        return Promise.resolve({
            type: 'model',
            data: {
                model: this.model,
                item: {
                    modelId: item.id
                },
                labels: {
                    //@ts-ignore
                    title: req.i18n.__('Add Product'),
                    //@ts-ignore
                    save: req.i18n.__('Save'),
                }
            }
        });
    }
    updateModelItems(modelId, data, catalogId) {
        // For Product, no specific update needed for navigation items
        return Promise.resolve(null);
    }
}
exports.Product = Product;
class ProductCatalog extends adminizer_1.AbstractCatalog {
    constructor() {
        super(sails.hooks.adminpanel.adminizer, [
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
