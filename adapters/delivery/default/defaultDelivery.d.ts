import { OrderRecord } from "../../../models/Order";
import DeliveryAdapter, { Delivery } from "../DeliveryAdapter";
export declare class DefaultDeliveryAdapter extends DeliveryAdapter {
    calculate(order: OrderRecord): Promise<Delivery>;
}
