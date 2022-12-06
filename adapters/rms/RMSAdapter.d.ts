import OrderResponse from "./OrderResponse";
import Order from "../../models/Order";
/**
 * An abstract RMS adapter class. Used to create new RMS adapters.
 */
export default abstract class RMSAdapter {
    protected readonly syncMenuTime: number;
    protected readonly syncBalanceTime: number;
    protected readonly syncStreetsTime: number;
    protected constructor(menuTime: number, balanceTime: number, streetsTime: number);
    /**
     * Menu synchronization with RMS system
     */
    protected abstract sync(): Promise<void>;
    /**
     * Synchronization of streets with RMS systems
     */
    protected abstract syncStreets(): Promise<void>;
    /**
     * Synchronizing the balance of dishes with the RMS adapter
     */
    protected abstract syncBalance(): Promise<void>;
    /**
     * Create an order
     * @param orderData - webresto order
     * @return Order response
     */
    abstract createOrder(orderData: Order): Promise<OrderResponse>;
    /**
     * Order check
     * @param orderData - webresto order
     * @return Order response
     */
    abstract checkOrder(orderData: Order): Promise<OrderResponse>;
    /**
     * Getting system information
     * @return RMS system information
     */
    abstract getSystemData(): Promise<any>;
    /**
     * Direct request to the RMS API
     * @param method - method name
     * @param params - params
     * @return
     */
    abstract api(method: string, params: any): Promise<any>;
    /**
     * Method for creating and getting an already existing RMS adapter
     * @param params - parameters for initialization
     */
    static getInstance(...params: any[]): RMSAdapter;
}
