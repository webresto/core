import Order from "../../../models/Order";
import DeliveryAdapter, { Delivery } from "../DeliveryAdapter";

export class DefaultDeliveryAdapter extends DeliveryAdapter {
  public async calculate(order: Order): Promise<Delivery> {
    console.log(" DefaultDeliveryAdapter calculate cost")

    const deliveryCost = await Settings.get("DELIVERY_COST") as string
    const deliveryItem = await Settings.get("DELIVERY_ITEM") as string
    const deliveryMessage = await Settings.get("DELIVERY_MESSAGE") as string    
    const freeDeliveryFrom = await Settings.get("FREE_DELIVERY_FROM") as string

    if (order.basketTotal > ( parseFloat(freeDeliveryFrom) ?? Infinity )) {
      return  {
        cost: null,
        item: undefined,
        message: ''
      }  
    } else {
      return  {
        cost: parseFloat(deliveryCost) ?? null,
        item: deliveryItem ?? undefined,
        message: deliveryMessage ?? ''
      }
    }

  }
  public async reset(order: Order): Promise<void> {
    console.log(" DefaultDeliveryAdapter Order reset ")
    return
  }
}