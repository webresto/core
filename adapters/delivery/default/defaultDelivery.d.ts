import Order from "../../../models/Order";
import DeliveryAdapter, { Delivery } from "../DeliveryAdapter";
export declare class DefaultDeliveryAdapter extends DeliveryAdapter {
    calculate(order: Order): Promise<Delivery>;
    reset(order: Order): Promise<void>;
}
