"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductMediaManager = void 0;
// todo: fix types model instance to {%ModelName%}Record for SelectedMediaFile";
const adminizer_1 = require("adminizer");
const Items_1 = require("./Items");
const ConvertType_1 = require("./helpers/ConvertType");
class ProductMediaManager extends adminizer_1.AbstractMediaManager {
    getItemsList(items) {
        throw new Error("Method not implemented.");
    }
    constructor() {
        super(sails.hooks.adminpanel.adminizer);
        this.id = 'product';
        // Set the fileStoragePath and urlPathPrefix for the AbstractMediaManager
        this.fileStoragePath = '.tmp/public';
        this.urlPathPrefix = 'image';
        // Use relative path as adminizer's mediaManagerAdapter will combine it with process.cwd()
        this.itemTypes.push(new Items_1.ImageItem(this.urlPathPrefix, this.fileStoragePath));
    }
    async setRelations(data, model, modelId, widgetName) {
        sails.log.silly(`Starting setRelations for model: ${model}, modelId: ${modelId}, widgetName: ${widgetName}`);
        // Debugging initial destruction query
        let destroy = {};
        destroy[model] = modelId;
        sails.log.silly(`Destroying selected media files with criteria:`, destroy);
        await SelectedMediaFile.destroy(destroy).fetch();
        // Debugging loop over data.list
        for (const [key, widgetItem] of data.entries()) {
            let init = {};
            init[`mediafile_${model}`] = widgetItem.id;
            init[model] = modelId;
            init["sortOrder"] = key + 1;
            if (model && modelId) {
                sails.log.silly(`Creating selected media file with data:`, init);
                await SelectedMediaFile.create(init).fetch();
            }
        }
        sails.log.debug(`Completed setRelations for model: ${model}, modelId: ${modelId}, widgetName: ${widgetName}`);
    }
    async getRelations(model, widgetName, modelId) {
        const widgetItems = [];
        const selectedFiles = await SelectedMediaFile.find({ [model]: modelId }).sort('sortOrder ASC');
        for (const selected of selectedFiles) {
            const mediaFileId = selected[`mediafile_${model}`];
            let file = await MediaFile.findOne({ id: mediaFileId });
            if (file) {
                const widgetItem = {
                    mimeType: `${file.type}/xxx`,
                    variants: null,
                    id: file.id
                };
                widgetItems.push(widgetItem);
            }
        }
        return widgetItems;
    }
    async getAll(limit, skip, sort, group) {
        let data = ConvertType_1.ConvertType.MF2Item(await MediaFile.find({
            where: {},
            limit: limit,
            skip: skip,
            sort: sort
        }));
        // Общее количество записей
        let totalRecords = await MediaFile.count({
            where: {}
        });
        // Если загружено меньше записей, чем есть всего, то next = true
        let next = (skip + limit) < totalRecords;
        return {
            data: data,
            next: next
        };
    }
    async searchAll(s) {
        throw `Not implemented by allowSearch`;
    }
}
exports.ProductMediaManager = ProductMediaManager;
