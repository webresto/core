// todo: fix types model instance to {%ModelName%}Record for Order"
import { DishRecord } from "../../models/Dish";
import { GroupRecord } from "../../models/Group";
import { OrderRecord } from "../../models/Order";
import { OrderDishRecord } from "../../models/OrderDish";
import AbstractPromotionHandler from "./AbstractPromotion";
// todo: fix types model instance to {%ModelName%}Record for Group';
// todo: fix types model instance to {%ModelName%}Record for Dish';
// todo: fix types model instance to {%ModelName%}Record for OrderDish";
export default abstract class AbstractPromotionAdapter {
    public abstract promotions: { [key: string]: AbstractPromotionHandler };

    /**
     * The order must be recorded in a model and modified during execution
     * @param order Order should populated order
     */
    public abstract processOrder(order: OrderRecordRecord): Promise<OrderRecord>

    public abstract displayDish(dish: DishRecord): DishRecord;
    public abstract displayGroup(group: GroupRecord): GroupRecord;
    public abstract getActivePromotionsIds(): string[];

    /**
     * Base realization clearOfPromotion
     * the order attribute will be changed during method execution
     *
     * This is in an abstract class because it's essentially part of the core, but you can rewrite it
     */
    public async clearOfPromotion(order: OrderRecordRecord): Promise<OrderRecord> {
        // if Order.status ="PAYMENT" or "ORDER" can't clear promotions
        if (order.state === "ORDER") throw `order with orderId ${order.id} in state ORDER`;
        //if (order.state === "PAYMENT") throw "order with orderId" + order.id + "in state PAYMENT";

        // const orderDishes = await OrderDish.find({ order: order.id }).populate("dish");

        await OrderDish.destroy({ order: order.id, addedBy: "promotion" }).fetch();
        await OrderDish.update({ order: order.id }, { discountTotal: 0, discountType: null, discountAmount: 0, discountMessage: null, discountId: null, discountDebugInfo: null  }).fetch();
        await Order.updateOne({ id: order.id }, { discountTotal: 0, promotionFlatDiscount: 0 });

        let dishes = order.dishes ? order.dishes as OrderDishRecord[] : []
        dishes.forEach((orderItem) => {
            orderItem.discountTotal = 0,
            orderItem.discountType = null,
            orderItem.discountAmount = 0,
            orderItem.discountMessage = null
            orderItem.discountId = null
            orderItem.discountDebugInfo = null
        })

        order.promotionState = [];
        order.promotionDelivery = null;
        order.promotionUnorderable = false;
        order.dishes = dishes;
        order.discountTotal = 0;
        order.promotionFlatDiscount = 0;
        order.promotionDelivery = null;
        return order
    }

    public abstract deletePromotion(id: string): void

    public abstract addPromotionHandler(promotionToAdd: AbstractPromotionHandler): Promise<void>;

    public abstract getPromotionHandlerById(id: string): AbstractPromotionHandler | undefined;
}
