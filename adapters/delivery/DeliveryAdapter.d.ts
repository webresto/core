import Address from "../../interfaces/Address";
import { OrderRecord } from "../../models/Order";
/**
 * **Soft delivery calculation**
 * This is done so that some deliveries can agree on the cost of delivery themselves.
 * If it is `allowed = true` and the `cost = null`,
 * then this is only possible if the required delivery calculation flag is absent
 */
export interface Delivery {
    deliveryTimeMinutes: number;
    allowed: boolean;
    cost: number | null;
    item: string | undefined;
    message: string;
    /**
     * A flag that shows that it was not possible to recognize how to make a delivery
     * street and house number not found.
     */
    deliveryLocationUnrecognized?: boolean;
    /**
     * This flag indicates that there was an error not related to business logic. Any error like new Error
     */
    hasError?: boolean;
}
export default abstract class DeliveryAdapter {
    /**
     * Calc delivery
     * @returns Delivery
     */
    abstract calculate(order: OrderRecord): Promise<Delivery>;
    /**
     * Reset order
     * @returns void
     */
    reset(order: OrderRecord): Promise<void>;
    abstract checkAbility(address: Address): Promise<Delivery>;
}
