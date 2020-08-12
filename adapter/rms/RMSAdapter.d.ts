import OrderResponse from "./OrderResponse";
import Cart from "../../models/Cart";
export default abstract class RMSAdapter {
    protected readonly syncMenuTime: number;
    protected readonly syncBalanceTime: number;
    protected readonly syncStreetsTime: number;
    protected constructor(menuTime: number, balanceTime: number, streetsTime: number);
    protected abstract sync(): Promise<void>;
    protected abstract syncStreets(): Promise<void>;
    protected abstract syncBalance(): Promise<void>;
    abstract createOrder(orderData: Cart): Promise<OrderResponse>;
    abstract checkOrder(orderData: Cart): Promise<OrderResponse>;
    abstract getSystemData(): Promise<any>;
    abstract api(method: string, params: any): Promise<any>;
    static getInstance(...params: any[]): RMSAdapter;
}
