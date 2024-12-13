import DeliveryAdapter, { Delivery } from "../DeliveryAdapter";
export declare class DefaultDeliveryAdapter extends DeliveryAdapter {
    calculate(order: OrderRecordRecord): Promise<Delivery>;
}
