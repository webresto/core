import Order from "../../../models/Order";
import DeliveryAdapter, { Delivery } from "../DeliveryAdapter";

export class DefaultDeliveryAdapter extends DeliveryAdapter {
  public async calculate(order: Order): Promise<Delivery> {
    const deliveryCost = await Settings.get("DELIVERY_COST") as string
    const deliveryItem = await Settings.get("DELIVERY_ITEM") as string
    const deliveryMessage = await Settings.get("DELIVERY_MESSAGE") as string    
    const freeDeliveryFrom = await Settings.get("FREE_DELIVERY_FROM") as string
    const minDeliveryAmount = await Settings.get("MIN_DELIVERY_AMOUNT") as number
    const minDeliveryTimeInMinutes = await Settings.get("MIN_DELIVERY_TIME_IN_MINUTES") as number

    
    if(order.basketTotal < minDeliveryAmount ?? 0) {
      return  { 
        allowed:false,
        deliveryTimeMinutes: minDeliveryTimeInMinutes ?? 60,
        cost: 0,
        item: undefined,
        message: `Minimum amount not allowed`
      }
    }

    if (order.basketTotal > ( parseFloat(freeDeliveryFrom) ?? Infinity )) {
      return  { 
        allowed: true,
        deliveryTimeMinutes: minDeliveryTimeInMinutes ?? 60,
        cost: 0,
        item: undefined,
        message: ''
      }  
    } else {
      return  {
        allowed: true,
        deliveryTimeMinutes: minDeliveryTimeInMinutes ?? 60,
        cost: deliveryCost ? parseFloat(deliveryCost) : 0,
        item: deliveryItem ?? undefined,
        message: deliveryMessage ?? ''
      }
    }
  }
}