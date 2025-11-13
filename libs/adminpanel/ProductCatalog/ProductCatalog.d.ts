import { AbstractCatalog, AbstractItem, Adminizer, Item } from "adminizer";
declare class BaseModelItem<T extends Item> extends AbstractItem<T> {
    adminizer: Adminizer;
    getAddTemplate(req: ReqType): Promise<{
        type: "component" | "navigation.group" | "navigation.link" | "model";
        data: any;
    }>;
    getEditTemplate(id: string | number, catalogId: string, req: ReqType, modelId?: string | number): Promise<{
        type: "component" | "navigation.group" | "navigation.link" | "model";
        data: any;
    }>;
    updateModelItems(modelId: string | number, data: any, catalogId: string): Promise<T>;
    type: string;
    name: string;
    allowedRoot: boolean;
    icon: string;
    model: string;
    readonly actionHandlers: any[];
    private toItem;
    find(itemId: string | number, catalogId: string): Promise<T>;
    update(itemId: string | number, data: Item, catalogId: string): Promise<T>;
    create(data: T, catalogId: string): Promise<T>;
    deleteItem(itemId: string | number, catalogId: string): Promise<void>;
    getChilds(parentId: string, catalogId: string): Promise<Item[]>;
    search(s: string, catalogId: string): Promise<T[]>;
}
export declare class Group<GroupProductItem extends Item> extends BaseModelItem<GroupProductItem> {
    name: string;
    allowedRoot: boolean;
    icon: string;
    type: string;
    isGroup: boolean;
    model: string;
    readonly actionHandlers: any[];
    getAddTemplate(req: any): Promise<any>;
    getEditTemplate(id: string | number, catalogId: string, req: any): Promise<any>;
}
export declare class Product<T extends Item> extends BaseModelItem<T> {
    name: string;
    allowedRoot: boolean;
    icon: string;
    type: string;
    model: string;
    readonly actionHandlers: any[];
    concept: string;
    getAddTemplate(req: ReqType): Promise<{
        type: "component" | "navigation.group" | "navigation.link" | "model";
        data: any;
    }>;
    getEditTemplate(id: string | number, catalogId: string, req: ReqType, modelId?: string | number): Promise<{
        type: "component" | "navigation.group" | "navigation.link" | "model";
        data: any;
    }>;
    updateModelItems(modelId: string | number, data: any, catalogId: string): Promise<T>;
}
export declare class ProductCatalog extends AbstractCatalog {
    readonly name: string;
    readonly slug: string;
    readonly maxNestingDepth: number;
    readonly icon: string;
    readonly actionHandlers: any[];
    constructor();
    getIdList(): Promise<string[]>;
}
export {};
