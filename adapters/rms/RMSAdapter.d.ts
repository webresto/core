import Order from "../../models/Order";
import Dish from "../../models/Dish";
import Group from "../../models/Group";
export type ConfigRMSAdapter = {
    [key: string]: ConfigRMSAdapter | number | boolean | string | null | undefined;
};
/**
 * An abstract RMS adapter class. Used to create new RMS adapters.
 */
export default abstract class RMSAdapter {
    readonly config: ConfigRMSAdapter;
    private static syncProductsInterval;
    private static syncOutOfStocksInterval;
    private initializationPromise;
    private syncProductsPromise;
    private syncOutOfStocksPromise;
    constructor(config?: ConfigRMSAdapter);
    /**
     * Waiting for initialization
     */
    wait(): Promise<void>;
    private initialize;
    /**
     * Menu synchronization with RMS system
     * At first, groups are synchronized, then dishes are synchronized for each of these groups.
     * When synchronizing groups, those groups that were not on the list will be turned off before the start of synchronization
     * Those dishes that are left without ties will be marked with isDeleted
     * There can be no dishes in the root.
     */
    syncProducts(concept?: string, force?: boolean): Promise<void>;
    /**
     * Synchronizing the balance of dishes with the RMS adapter
     */
    syncOutOfStocks(): Promise<void>;
    /**
     * This method will call before the main initialization
     * @returns boolean
     */
    protected abstract customInitialize(): Promise<void>;
    /**
     * This method will call after the main initialization
     * @returns boolean
     */
    protected abstract initialized(): Promise<void>;
    /**
     * Checks whether the nomenclature was updated if the last time something has changed will return to True
     * @returns boolean
     */
    protected abstract nomenclatureHasUpdated(): Promise<boolean>;
    /**
     *
     * @returns
     */
    protected abstract loadNomenclatureTree(rmsGroupIds?: string[]): Promise<Group[]>;
    protected abstract loadProductsByGroup(group: Group): Promise<Dish[]>;
    protected abstract loadOutOfStocksDishes(concept?: string): Promise<Pick<Dish, "balance" | "rmsId">[]>;
    /**
     * Create an order
     * @param orderData - webresto order
     * @return Order response
     */
    abstract createOrder(orderData: Order): Promise<Order>;
    /**
     * Order check before order
     * @param orderData - webresto order
     * @return Order response
     */
    abstract checkOrder(orderData: Order): Promise<Order>;
    /**
     * Direct request to the RMS API
     * @param method - method name
     * @param params - params
     * @return
     */
    abstract api(method: string, params: any): Promise<any>;
}
