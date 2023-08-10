import Order from "../../models/Order";
export interface Delivery {
    deliveryTimeMinutes: number;
    allowed: boolean;
    cost: number;
    item: string | undefined;
    message: string;
}
export default abstract class DeliveryAdapter {
    /**
     * Calc delivery
     * @returns Delivery
     */
    abstract calculate(order: Order): Promise<Delivery>;
    /**
     * Reset order
     * @returns void
     */
    reset(order: Order): Promise<void>;
}
