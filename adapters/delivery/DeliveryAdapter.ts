import Order from "../../models/Order";


/**
 * **Soft delivery calculation**
 * This is done so that some deliveries can agree on the cost of delivery themselves.
 * If it is `allowed = true` and the `cost = null`, 
 * then this is only possible if the required delivery calculation flag is absent
 */
export interface Delivery {
  deliveryTimeMinutes: number
  allowed: boolean
  cost: number | null
  item: string | undefined
  message: string
}

export default abstract class DeliveryAdapter {
  
  /**
   * Calc delivery
   * @returns Delivery
   */
  public abstract calculate(order: Order): Promise<Delivery>;

  /**
   * Reset order
   * @returns void
   */
  public async reset(order: Order): Promise<void> {
    order.delivery = null
    order.deliveryCost = 0;
    order.deliveryItem = null;
    order.deliveryDescription = '';
  }
}
