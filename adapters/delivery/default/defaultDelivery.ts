// todo: fix types model instance to {%ModelName%}Record for Order";
import { OrderRecord } from "../../../models/Order";
import DeliveryAdapter, { Delivery } from "../DeliveryAdapter";

export class DefaultDeliveryAdapter extends DeliveryAdapter {
  public async calculate(order: OrderRecordRecord): Promise<Delivery> {
    const deliveryCost = await Settings.get("DELIVERY_COST");
    const deliveryItem = await Settings.get("DELIVERY_ITEM");
    const deliveryMessage = await Settings.get("DELIVERY_MESSAGE");
    const freeDeliveryFrom = await Settings.get("FREE_DELIVERY_FROM");
    const minDeliveryAmount = await Settings.get("MIN_DELIVERY_AMOUNT");
    const minDeliveryTimeInMinutes = await Settings.get("MIN_DELIVERY_TIME_IN_MINUTES");

    if(order.basketTotal < minDeliveryAmount ?? 0) {
      return  {
        allowed:false,
        deliveryTimeMinutes: minDeliveryTimeInMinutes ?? 60,
        cost: 0,
        item: undefined,
        message: `Minimum amount not allowed`
      }
    }

    if (order.basketTotal > ( freeDeliveryFrom ?? Infinity )) {
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
        cost: deliveryCost ? deliveryCost : 0,
        item: deliveryItem ?? undefined,
        message: deliveryMessage ?? ''
      }
    }
  }
}
