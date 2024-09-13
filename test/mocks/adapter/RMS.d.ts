import RMSAdapter from "../../../adapters/rms/RMSAdapter";
export declare class TestRMS extends RMSAdapter {
    protected initialized(): Promise<void>;
    protected customInitialize(): Promise<void>;
    protected loadOutOfStocksDishes(concept?: string): Promise<Dish[]>;
    protected nomenclatureHasUpdated(): Promise<boolean>;
    /**
     Since 7 dishes are created for each group, the total number of dishes will be 88 groups * 7 dishes = 616 dishes.
    *  */
    protected loadNomenclatureTree(rmsGroupIds?: string[]): Promise<Group[]>;
    protected loadProductsByGroup(group: Group): Promise<Dish[]>;
    createOrder(orderData: Order): Promise<Order>;
    checkOrder(orderData: Order): Promise<Order>;
    api(method: string, params: any): Promise<any>;
}
