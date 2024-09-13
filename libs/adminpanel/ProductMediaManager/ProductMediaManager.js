"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultMediaManager = void 0;
// todo: fix types model instance to {%ModelName%}Record for SelectedMediaFile";
const AbstractMediaManager_1 = require("sails-adminpanel/lib/media-manager/AbstractMediaManager");
const Items_1 = require("./Items");
class DefaultMediaManager extends AbstractMediaManager_1.AbstractMediaManager {
    constructor(id, path, dir, model, metaModel, modelAssoc) {
        super(id, path, dir, model, modelAssoc);
        this.itemTypes = [];
        this.itemTypes.push(new Items_1.ImageItem(path, dir, model, metaModel));
    }
    async getAll(limit, skip, sort) {
        let data = await MediaFile.find({
            where: {},
            limit: limit,
            skip: skip,
            sort: sort //@ts-ignore
        }).populate('children', { sort: sort });
        let next = await MediaFile.count({
            where: {},
            limit: limit,
            skip: skip === 0 ? limit : skip + limit,
            sort: sort
        });
        return {
            data: data,
            next: !!next
        };
    }
    async searchAll(s) {
        return [];
        // return await MediaFile.find({
        // 	where: {filename: {contains: s}, parent: null},
        // 	sort: 'createdAt DESC'
        // }).populate('children', {sort: 'createdAt DESC'})
    }
    async saveRelations(data, model, modelId, modelAttribute) {
        let widgetItems = [];
        for (const [key, widgetItem] of data.list.entries()) {
            let init = {};
            init[`mediafile_${model}`] = widgetItem.id;
            init[model] = modelId;
            init["sortOrder"] = key + 1;
            let record = await SelectedMediaFile.create(init).fetch();
            // widgetItems.push({
            // 	id: record.id as string,
            // })
        }
        // let updateData: { [key: string]: MediaManagerWidgetJSON } = {}
        // updateData[modelAttribute] = {list: widgetItems, mediaManagerId: this.id}
        // await MediaFile.update({id: modelId}, updateData)
    }
    async getRelations(items) {
        let widgetItems = [];
        for (const item of items) {
            let record = (await SelectedMediaFile.find({ where: { id: item.id } }))[0];
            let file = (await MediaFile.find({ where: { id: record.file } }).populate('children', { sort: 'createdAt DESC' }))[0];
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
        let modelAssociations = await SelectedMediaFile.find({ where: { modelId: modelId, model: model } });
        for (const modelAssociation of modelAssociations) {
            await SelectedMediaFile.destroy(modelAssociation.id).fetch();
        }
    }
}
exports.DefaultMediaManager = DefaultMediaManager;
