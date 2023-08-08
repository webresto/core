import Order from "../../models/Order";


export interface Delivery {
  cost: number | null
  item: string | undefined
  message?: string
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
  public abstract reset(order: Order): Promise<void>;
}
