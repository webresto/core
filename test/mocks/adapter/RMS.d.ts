import RMSAdapter from "../../../adapters/rms/RMSAdapter";
import { DishRecord } from "../../../models/Dish";
import { GroupRecord } from "../../../models/Group";
import { OrderRecord } from "../../../models/Order";
export declare class TestRMS extends RMSAdapter {
    protected initialized(): Promise<void>;
    protected customInitialize(): Promise<void>;
    protected loadOutOfStocksDishes(concept?: string): Promise<DishRecord[]>;
    protected nomenclatureHasUpdated(): Promise<boolean>;
    /**
     Since 7 dishes are created for each group, the total number of dishes will be 88 groups * 7 dishes = 616 dishes.
    *  */
    protected loadNomenclatureTree(rmsGroupIds?: string[]): Promise<GroupRecord[]>;
    protected loadProductsByGroup(group: GroupRecord): Promise<DishRecord[]>;
    createOrder(orderData: OrderRecord): Promise<OrderRecord>;
    checkOrder(orderData: OrderRecord): Promise<OrderRecord>;
    api(method: string, params: any): Promise<any>;
}
