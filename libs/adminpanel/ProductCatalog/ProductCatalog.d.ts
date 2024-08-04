import { AbstractCatalog, AbstractItem, Item } from "sails-adminpanel/lib/catalog/AbstractCatalog";
declare class BaseModelItem<T extends Item> extends AbstractItem<T> {
    type: string;
    name: string;
    allowedRoot: boolean;
    icon: string;
    model: string;
    readonly actionHandlers: any[];
    find(itemId: string | number): Promise<any>;
    update(itemId: string | number, data: Item): Promise<T>;
    create(catalogId: string, data: T): Promise<T>;
    deleteItem(itemId: string | number): Promise<void>;
    getAddHTML(): Promise<{
        type: "link" | "html";
        data: string;
    }>;
    getEditHTML(id: string | number, parenId?: string | number): Promise<{
        type: "link" | "html";
        data: string;
    }>;
    getChilds(parentId: string | number): Promise<Item[]>;
    search(s: string): Promise<T[]>;
    updateModelItems(itemId: string | number, data: T, catalogId: string): Promise<T>;
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
}
export declare class ProductCatalog extends AbstractCatalog {
    readonly name: string;
    readonly slug: string;
    readonly maxNestingDepth: number;
    readonly icon: string;
    readonly actionHandlers: any[];
    constructor();
}
export {};
