import { AbstractMediaManager, MediaManagerItem, MediaManagerWidgetItem, MediaManagerWidgetData, MediaManagerWidgetClientItem, SortCriteria } from "sails-adminpanel/lib/media-manager/AbstractMediaManager";
export declare class ProductMediaManager extends AbstractMediaManager {
    id: string;
    constructor();
    setRelations(data: MediaManagerWidgetData, model: string, modelId: string, widgetName: string): Promise<void>;
    getRelations(items: MediaManagerWidgetItem[]): Promise<MediaManagerWidgetClientItem[]>;
    getAll(limit: number, skip: number, sort: SortCriteria, group?: string): Promise<{
        data: MediaManagerItem[];
        next: boolean;
    }>;
    searchAll(s: string): Promise<MediaManagerItem[]>;
}
