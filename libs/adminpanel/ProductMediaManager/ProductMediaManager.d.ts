import { AbstractMediaManager, MediaManagerItem, MediaManagerWidgetItem, MediaManagerWidgetData, MediaManagerWidgetClientItem, SortCriteria } from "adminizer";
export declare class ProductMediaManager extends AbstractMediaManager {
    getItemsList(items: MediaManagerWidgetItem[]): Promise<MediaManagerWidgetClientItem[]>;
    id: string;
    constructor();
    setRelations(data: [MediaManagerWidgetData], model: string, modelId: string | number, widgetName: string): Promise<void>;
    getRelations(model: string, widgetName: string, modelId: string | number): Promise<MediaManagerWidgetClientItem[]>;
    getAll(limit: number, skip: number, sort: SortCriteria, group?: string): Promise<{
        data: MediaManagerItem[];
        next: boolean;
    }>;
    searchAll(s: string): Promise<MediaManagerItem[]>;
}
