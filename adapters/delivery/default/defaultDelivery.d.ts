import Address from "../../../interfaces/Address";
import { OrderRecord } from "../../../models/Order";
import DeliveryAdapter, { Delivery } from "../DeliveryAdapter";
export declare class DefaultDeliveryAdapter extends DeliveryAdapter {
    checkAbility(address: Address): Promise<Delivery>;
    calculate(order: OrderRecord): Promise<Delivery>;
}
