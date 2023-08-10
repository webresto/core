import Order from "../../models/Order";


export interface Delivery {
  deliveryTimeMinutes: number
  allowed: boolean
  cost: number
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
