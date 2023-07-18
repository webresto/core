import RMSAdapter, { OrderResponse } from "../../../adapters/rms/RMSAdapter";
import Dish from "../../../models/Dish";
import Group from "../../../models/Group";
import Order from "../../../models/Order";

export class TestRMS  extends RMSAdapter {
    protected  async nomenclatureHasUpdated(): Promise<boolean> {
        return true
    }
    protected loadNomenclatureTree(groupIds?: string[]): Promise<Group[]> {
        throw new Error("Method not implemented.");
    }
    protected loadProductsByGroup(groupId: string): Promise<Dish[]> {
        throw new Error("Method not implemented.");
    }
    
    public createOrder(orderData: Order): Promise<OrderResponse> {
        throw new Error("Method not implemented.");
    }
    
    public checkOrder(orderData: Order): Promise<OrderResponse> {
        throw new Error("Method not implemented.");
    }

    public api(method: string, params: any): Promise<any> {
        throw process.env[method] = JSON.stringify(params);
    }
    
    constructor() {
        super();
    }
}