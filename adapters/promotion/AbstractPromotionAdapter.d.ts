import { DishRecord } from "../../models/Dish";
import { GroupRecord } from "../../models/Group";
import { OrderRecord } from "../../models/Order";
import AbstractPromotionHandler from "./AbstractPromotion";
export default abstract class AbstractPromotionAdapter {
    abstract promotions: {
        [key: string]: AbstractPromotionHandler;
    };
    /**
     * The order must be recorded in a model and modified during execution
     * @param order Order should populated order
     */
    abstract processOrder(order: OrderRecord): Promise<OrderRecord>;
    abstract displayDish(dish: DishRecord): DishRecord;
    abstract displayGroup(group: GroupRecord): GroupRecord;
    abstract getActivePromotionsIds(): string[];
    /**
     * Base realization clearOfPromotion
     * the order attribute will be changed during method execution
     *
     * This is in an abstract class because it's essentially part of the core, but you can rewrite it
     */
    clearOfPromotion(order: OrderRecord): Promise<OrderRecord>;
    abstract deletePromotion(id: string): void;
    abstract addPromotionHandler(promotionToAdd: AbstractPromotionHandler): Promise<void>;
    abstract getPromotionHandlerById(id: string): AbstractPromotionHandler | undefined;
}
