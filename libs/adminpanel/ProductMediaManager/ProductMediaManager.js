"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductMediaManager = void 0;
// todo: fix types model instance to {%ModelName%}Record for SelectedMediaFile";
const AbstractMediaManager_1 = require("sails-adminpanel/lib/media-manager/AbstractMediaManager");
const Items_1 = require("./Items");
const ConvertType_1 = require("./helpers/ConvertType");
class ProductMediaManager extends AbstractMediaManager_1.AbstractMediaManager {
    constructor() {
        super();
        this.id = 'product';
        this.itemTypes.push(new Items_1.ImageItem('/image', process.cwd() + "/.tmp/public/image"));
        console.log(this.itemTypes);
    }
    async setRelations(data, model, modelId, widgetName) {
        sails.log.silly(`Starting setRelations for model: ${model}, modelId: ${modelId}, widgetName: ${widgetName}`);
        // Debugging initial destruction query
        let destroy = {};
        destroy[model] = modelId;
        sails.log.silly(`Destroying selected media files with criteria:`, destroy);
        await SelectedMediaFile.destroy(destroy).fetch();
        // Debugging loop over data.list
        for (const [key, widgetItem] of data.list.entries()) {
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
    async getRelations(items) {
        const widgetItems = [];
        for (const item of items) {
            let file = await MediaFile.findOne({ id: item.id });
            const widgetItem = {
                mimeType: `${file.type}/xxx`,
                variants: null,
                id: file.id
            };
            widgetItems.push(widgetItem);
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
