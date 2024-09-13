import { AbstractMediaManager, Item, File, MediaManagerWidgetItem, Data } from "sails-adminpanel/lib/media-manager/AbstractMediaManager";
export declare class DefaultMediaManager extends AbstractMediaManager {
    readonly itemTypes: File<Item>[];
    constructor(id: string, path: string, dir: string, model: string, metaModel: string, modelAssoc: string);
    getAll(limit: number, skip: number, sort: string): Promise<{
        data: Item[];
        next: boolean;
    }>;
    searchAll(s: string): Promise<Item[]>;
    saveRelations(data: Data, model: string, modelId: string, modelAttribute: string): Promise<void>;
    getRelations(items: MediaManagerWidgetItem[]): Promise<MediaManagerWidgetItem[]>;
    updateRelations(data: Data, model: string, modelId: string, modelAttribute: string): Promise<void>;
    deleteRelations(model: string, modelId: string): Promise<void>;
}
