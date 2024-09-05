"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultMediaManager = void 0;
const AbstractMediaManager_1 = require("./AbstractMediaManager");
const Items_1 = require("./Items");
class DefaultMediaManager extends AbstractMediaManager_1.AbstractMediaManager {
    constructor(id, path, dir, model, metaModel, modelAssoc) {
        super(id, path, dir, model, modelAssoc);
        this.itemTypes = [];
        this.itemTypes.push(new Items_1.ImageItem(path, dir, model, metaModel));
        this.itemTypes.push(new Items_1.TextItem(path, dir, model, metaModel));
        this.itemTypes.push(new Items_1.ApplicationItem(path, dir, model, metaModel));
        this.itemTypes.push(new Items_1.VideoItem(path, dir, model, metaModel));
    }
    async getAll(limit, skip, sort) {
        let data = await sails.models[this.model].find({
            where: { parent: null },
            limit: limit,
            skip: skip,
            sort: sort //@ts-ignore
        }).populate('children', { sort: sort });
        let next = (await sails.models[this.model].find({
            where: { parent: null },
            limit: limit,
            skip: skip === 0 ? limit : skip + limit,
            sort: sort
        })).length;
        return {
            data: data,
            next: !!next
        };
    }
    async searchAll(s) {
        return await sails.models[this.model].find({
            where: { filename: { contains: s }, parent: null },
            sort: 'createdAt DESC'
        }).populate('children', { sort: 'createdAt DESC' });
    }
    async saveRelations(data, model, modelId, modelAttribute) {
        let widgetItems = [];
        for (const [key, widgetItem] of data.list.entries()) {
            let record = await sails.models[this.modelAssoc].create({
                mediaManagerId: this.id,
                model: model,
                modelId: modelId,
                file: widgetItem.id,
                sortOrder: key + 1,
            }).fetch();
            widgetItems.push({
                id: record.id,
            });
        }
        let updateData = {};
        updateData[modelAttribute] = { list: widgetItems, mediaManagerId: this.id };
        await sails.models[model].update({ id: modelId }, updateData);
    }
    async getRelations(items) {
        let widgetItems = [];
        for (const item of items) {
            let record = (await sails.models[this.modelAssoc].find({ where: { id: item.id } }))[0];
            let file = (await sails.models[this.model].find({ where: { id: record.file } }).populate('children', { sort: 'createdAt DESC' }))[0];
            widgetItems.push({
                id: file.id,
                children: file.children,
            });
        }
        return widgetItems;
    }
    async updateRelations(data, model, modelId, modelAttribute) {
        await this.deleteRelations(model, modelId);
        await this.saveRelations(data, model, modelId, modelAttribute);
    }
    async deleteRelations(model, modelId) {
        let modelAssociations = await sails.models[this.modelAssoc].find({ where: { modelId: modelId, model: model } });
        for (const modelAssociation of modelAssociations) {
            await sails.models[this.modelAssoc].destroy(modelAssociation.id).fetch();
        }
    }
}
exports.DefaultMediaManager = DefaultMediaManager;
