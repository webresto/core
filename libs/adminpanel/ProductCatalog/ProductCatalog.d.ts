import { AbstractCatalog, AbstractItem, Item } from "sails-adminpanel/lib/catalog/AbstractCatalog";
declare class BaseModelItem<T extends Item> extends AbstractItem<T> {
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
    deleteItem(itemId: string | number, catalogId: string): any;
    getAddHTML(): Promise<{
        type: "link" | "html";
        data: string;
    }>;
    getEditHTML(id: string | number, parenId?: string | number): Promise<{
        type: "link" | "html";
        data: string;
    }>;
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
}
export declare class Product<T extends Item> extends BaseModelItem<T> {
    name: string;
    allowedRoot: boolean;
    icon: string;
    type: string;
    model: string;
    readonly actionHandlers: any[];
    concept: string;
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
