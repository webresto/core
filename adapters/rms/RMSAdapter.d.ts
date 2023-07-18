import Order from "../../models/Order";
import Dish from "../../models/Dish";
import Group from "../../models/Group";
export type ConfigRMSAdapter = {
    [key: string]: number | boolean | string;
};
/**
 * Responce from RMS
 */
interface OrderResponse {
    code: number;
    body: any;
}
/**
 * An abstract RMS adapter class. Used to create new RMS adapters.
 */
export default abstract class RMSAdapter {
    readonly config: ConfigRMSAdapter;
    private static syncProductsInterval;
    private static syncOutOfStocksInterval;
    constructor(config?: ConfigRMSAdapter);
    private static initialize;
    /**
     * Menu synchronization with RMS system
     */
    static syncProducts(force?: boolean): Promise<void>;
    /**
     * Synchronizing the balance of dishes with the RMS adapter
     */
    static syncOutOfStocks(): Promise<void>;
    /**
     * Checks whether the nomenclature was updated if the last time something has changed will return to True
     * @returns boolean
     */
    protected abstract nomenclatureHasUpdated(): Promise<boolean>;
    /**
     *
     * @returns
     */
    protected abstract loadNomenclatureTree(groupIds?: string[]): Promise<Group[]>;
    protected abstract loadProductsByGroup(groupId: string): Promise<Dish[]>;
    /**
     * Create an order
     * @param orderData - webresto order
     * @return Order response
     */
    abstract createOrder(orderData: Order): Promise<OrderResponse>;
    /**
     * Order check before order
     * @param orderData - webresto order
     * @return Order response
     */
    abstract checkOrder(orderData: Order): Promise<OrderResponse>;
    /**
     * Direct request to the RMS API
     * @param method - method name
     * @param params - params
     * @return
     */
    abstract api(method: string, params: any): Promise<any>;
}
export {};
