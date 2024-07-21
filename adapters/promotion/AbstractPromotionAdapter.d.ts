import Order from "../../models/Order";
import AbstractPromotionHandler from "./AbstractPromotion";
import Group from './../../models/Group';
import Dish from './../../models/Dish';
export default abstract class AbstractPromotionAdapter {
    abstract promotions: {
        [key: string]: AbstractPromotionHandler;
    };
    /**
     * The order must be recorded in a model and modified during execution
     * @param order Order should populated order
     */
    abstract processOrder(order: Order): Promise<Order>;
    abstract displayDish(dish: Dish): Dish;
    abstract displayGroup(group: Group): Group;
    abstract getActivePromotionsIds(): string[];
    /**
     * Base realization clearOfPromotion
     * the order attribute will be changed during method execution
     *
     * This is in an abstract class because it's essentially part of the core, but you can rewrite it
     */
    clearOfPromotion(order: Order): Promise<Order>;
    abstract deletePromotion(id: string): void;
    abstract addPromotionHandler(promotionToAdd: AbstractPromotionHandler): Promise<void>;
    abstract getPromotionHandlerById(id: string): AbstractPromotionHandler | undefined;
}
